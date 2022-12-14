<template>
  <div class="space-overview oc-flex">
    <keyboard-actions :paginated-resources="paginatedResources" />
    <files-view-wrapper>
      <app-bar
        :has-bulk-actions="true"
        :breadcrumbs="breadcrumbs"
        :breadcrumbs-context-actions-items="[currentFolder]"
        :show-actions-on-selection="true"
        :side-bar-open="sideBarOpen"
      >
        <template #actions="{ limitedScreenSpace }">
          <create-and-upload :limited-screen-space="limitedScreenSpace" />
        </template>
      </app-bar>
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <not-found-message v-if="!space.id" class="space-not-found oc-height-1-1" />
        <div v-else-if="isSpaceRoot">
          <div class="oc-px-m oc-mt-m" :class="{ 'oc-flex': imageContent && !imageExpanded }">
            <div v-if="imageContent" :class="{ 'oc-width-1-4 oc-mr-l': !imageExpanded }">
              <img
                :class="{ expanded: imageExpanded }"
                class="space-overview-image oc-cursor-pointer"
                alt=""
                :src="imageContent"
                @click="toggleImageExpanded"
              />
            </div>
            <div :class="{ 'oc-width-3-4': imageContent && !imageExpanded }">
              <div class="oc-flex oc-mb-s oc-flex-middle oc-flex-between">
                <div class="oc-flex oc-flex-middle">
                  <h1 class="space-overview-name oc-text-truncate">{{ space.name }}</h1>
                  <oc-button
                    :id="`space-context-btn`"
                    v-oc-tooltip="$gettext('Show context menu')"
                    :aria-label="$gettext('Show context menu')"
                    appearance="raw"
                    class="oc-ml-s"
                  >
                    <oc-icon name="more-2" />
                  </oc-button>
                  <oc-drop
                    :drop-id="`space-context-drop`"
                    :toggle="`#space-context-btn`"
                    mode="click"
                    close-on-click
                    :options="{ delayHide: 0 }"
                    padding-size="small"
                    position="right-start"
                  >
                    <space-context-actions :items="[space]" />
                  </oc-drop>
                </div>
                <oc-button
                  v-if="memberCount"
                  :aria-label="$gettext('Open context menu and show members')"
                  appearance="raw"
                  @click="openSidebarSharePanel"
                >
                  <oc-icon name="group" fill-type="line" size="small" />
                  <span
                    class="space-overview-people-count oc-text-small"
                    v-text="memberCountString"
                  ></span>
                </oc-button>
              </div>
              <p v-if="space.description" class="oc-mt-rm">{{ space.description }}</p>
              <div>
                <!-- eslint-disable vue/no-v-html -->
                <div
                  ref="markdownContainer"
                  class="markdown-container"
                  v-html="markdownContent"
                ></div>
                <!-- eslint-enable -->
                <div v-if="showMarkdownCollapse" class="markdown-collapse oc-text-center oc-mt-s">
                  <oc-button appearance="raw" @click="toggleCollapseMarkdown">
                    <oc-icon :name="markdownCollapseIcon" />
                    <span>{{ markdownCollapseText }}</span>
                  </oc-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <no-content-message v-if="isEmpty" id="files-space-empty" class="files-empty" icon="folder">
          <template #message>
            <p v-translate class="oc-text-muted">No resources found</p>
          </template>
        </no-content-message>
        <resource-table
          v-else
          id="files-spaces-table"
          v-model="selectedResourcesIds"
          class="files-table oc-mt-xl"
          :resources="paginatedResources"
          :target-route="resourceTargetLocation"
          :sort-by="sortBy"
          :sort-dir="sortDir"
          :drag-drop="true"
          @fileDropped="fileDropped"
          @sort="handleSort"
          @fileClick="$_fileActions_triggerDefaultAction"
          @rowMounted="rowMounted"
        >
          <template #quickActions="{ resource }">
            <quick-actions
              :class="resource.preview"
              class="oc-visible@s"
              :item="resource"
              :actions="app.quickActions"
            />
          </template>
          <template #contextMenu="{ resource }">
            <context-actions v-if="isResourceInSelection(resource)" :items="selectedResources" />
          </template>
          <template #footer>
            <pagination :pages="paginationPages" :current-page="paginationPage" />
            <list-info
              v-if="paginatedResources.length > 0"
              class="oc-width-1-1 oc-my-s"
              :files="totalFilesCount.files"
              :folders="totalFilesCount.folders"
              :size="totalFilesSize"
            />
          </template>
        </resource-table>
      </template>
    </files-view-wrapper>
    <side-bar :open="sideBarOpen" :active-panel="sideBarActivePanel" />
  </div>
</template>

<script lang="ts">
import NoContentMessage from 'web-pkg/src/components/NoContentMessage.vue'
import NotFoundMessage from '../../components/FilesList/NotFoundMessage.vue'
import AppLoadingSpinner from 'web-pkg/src/components/AppLoadingSpinner.vue'
import { computed, defineComponent, ref } from '@vue/composition-api'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import MixinAccessibleBreadcrumb from '../../mixins/accessibleBreadcrumb'
import { bus } from 'web-pkg/src/instance'
import { breadcrumbsFromPath, concatBreadcrumbs } from '../../helpers/breadcrumbs'
import { buildResource } from '../../helpers/resources'
import { move } from '../../helpers/resource'
import { loadPreview } from 'web-pkg/src/helpers'
import ResourceTable from '../../components/FilesList/ResourceTable.vue'
import { createLocationSpaces } from '../../router'
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex'
import AppBar from '../../components/AppBar/AppBar.vue'
import CreateAndUpload from '../../components/AppBar/CreateAndUpload.vue'
import ListInfo from '../../components/FilesList/ListInfo.vue'
import Pagination from '../../components/FilesList/Pagination.vue'
import ContextActions from '../../components/FilesList/ContextActions.vue'
import MixinFileActions from '../../mixins/fileActions'
import { ImageDimension, ImageType } from '../../constants'
import debounce from 'lodash-es/debounce'
import { VisibilityObserver } from 'web-pkg/src/observer'
import SpaceContextActions from '../../components/Spaces/SpaceContextActions.vue'
import { useResourcesViewDefaults } from '../../composables'
import { useAccessToken, useStore } from 'web-pkg/src/composables'
import KeyboardActions from '../../components/FilesList/KeyboardActions.vue'
import QuickActions from '../../components/FilesList/QuickActions.vue'
import { configurationManager } from 'web-pkg/src/configuration'
import { buildWebDavSpacesPath } from 'web-client/src/helpers'
import SideBar from '../../components/SideBar/SideBar.vue'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { SideBarEventTopics } from '../../composables/sideBar'

const visibilityObserver = new VisibilityObserver()

export default defineComponent({
  components: {
    FilesViewWrapper,
    SideBar,
    AppBar,
    CreateAndUpload,
    NoContentMessage,
    AppLoadingSpinner,
    NotFoundMessage,
    ResourceTable,
    ListInfo,
    Pagination,
    ContextActions,
    SpaceContextActions,
    KeyboardActions,
    QuickActions
  },
  mixins: [MixinAccessibleBreadcrumb, MixinFileActions],
  provide() {
    return {
      currentSpace: computed(() => this.space)
    }
  },
  setup() {
    const store = useStore()
    const space = ref({})

    return {
      ...useResourcesViewDefaults(),
      resourceTargetLocation: createLocationSpaces('files-spaces-project'),
      space,
      accessToken: useAccessToken({ store })
    }
  },
  data: function () {
    return {
      markdownContent: '',
      markdownCollapsed: true,
      markdownContainerCollapsedClass: 'collapsed',
      showMarkdownCollapse: false,
      markdownResizeObserver: new ResizeObserver(this.onMarkdownResize),
      imageExpanded: false,
      imageContent: null
    }
  },
  computed: {
    ...mapGetters('Files', [
      'highlightedFile',
      'currentFolder',
      'totalFilesCount',
      'totalFilesSize'
    ]),
    ...mapGetters(['user', 'configuration']),
    ...mapState(['app']),

    breadcrumbs() {
      return concatBreadcrumbs(
        {
          text: this.$gettext('Spaces'),
          to: { path: '/files/spaces/projects' }
        },
        {
          text: this.space?.name,
          to: { path: `/files/spaces/projects/${this.$route.params.storageId}` }
        },
        ...breadcrumbsFromPath(this.$route, this.$route.params.item)
      )
    },

    isSpaceRoot() {
      return !this.$route.params.item
    },
    isEmpty() {
      return this.paginatedResources.length < 1
    },

    markdownCollapseIcon() {
      return this.markdownCollapsed === true ? 'add' : 'subtract'
    },
    markdownCollapseText() {
      return this.markdownCollapsed === true
        ? this.$gettext('Show more')
        : this.$gettext('Show less')
    },
    displayThumbnails() {
      return !this.configuration?.options?.disablePreviews
    },
    memberCount() {
      return this.space.spaceMemberIds.length
    },
    memberCountString() {
      const translated = this.$ngettext('%{count} member', '%{count} members', this.memberCount)

      return this.$gettextInterpolate(translated, {
        count: this.memberCount
      })
    }
  },
  watch: {
    $route: {
      handler: async function (to, from) {
        const sameRoute = to.name === from?.name && to.params?.storageId === from?.params?.storageId
        const sameItem = to.params?.item === from?.params?.item

        if ((!sameRoute || !sameItem) && from) {
          await this.loadResourcesTask.perform(this, sameRoute, to.params.item)
        }

        if (this.$refs.markdownContainer) {
          if (this.markdownResizeObserver) {
            this.markdownResizeObserver.unobserve(this.$refs.markdownContainer)
          }
          this.markdownResizeObserver.observe(this.$refs.markdownContainer)
        }
      },
      immediate: true
    },
    'space.spaceImageData': {
      handler: function (val) {
        if (!val) {
          return
        }
        const decodedUri = decodeURI(this.space.spaceImageData.webDavUrl)
        const webDavPathComponents = decodedUri.split('/')
        const idComponent = webDavPathComponents.find((c) => c.startsWith(this.space.id))
        if (!idComponent) {
          return
        }
        const path = webDavPathComponents
          .slice(webDavPathComponents.indexOf(idComponent) + 1)
          .join('/')

        this.$client.files
          .fileInfo(buildWebDavSpacesPath(idComponent, decodeURIComponent(path)))
          .then((data) => {
            const resource = buildResource(data)
            loadPreview({
              resource,
              isPublic: false,
              dimensions: ImageDimension.Preview,
              server: configurationManager.serverUrl,
              userId: this.user.id,
              token: this.accessToken
            }).then((imageBlob) => {
              this.imageContent = imageBlob
            })
          })
      },
      deep: true
    },
    'space.spaceReadmeData': {
      handler: function (val) {
        if (!val) {
          return
        }
        const decodedUri = decodeURI(this.space.spaceReadmeData.webDavUrl)
        const webDavPathComponents = decodedUri.split('/')
        const idComponent = webDavPathComponents.find((c) => c.startsWith(this.space.id))
        if (!idComponent) {
          return
        }
        const path = webDavPathComponents
          .slice(webDavPathComponents.indexOf(idComponent) + 1)
          .join('/')

        this.$client.files
          .getFileContents(buildWebDavSpacesPath(idComponent, decodeURIComponent(path)))
          .then((fileContents) => {
            if (this.markdownResizeObserver && this.$refs.markdownContainer) {
              this.markdownResizeObserver.unobserve(this.$refs.markdownContainer)
            }
            const parsedMarkdown = marked.parse(fileContents)
            // Sanitize markdown content to prevent XSS vulnerabilities
            this.markdownContent = sanitizeHtml(parsedMarkdown)

            if (this.markdownContent) {
              this.markdownResizeObserver.observe(this.$refs.markdownContainer)
            }
          })
      },
      deep: true
    }
  },
  async mounted() {
    await this.loadResourcesTask.perform(this, false, this.$route.params.item || '')

    document.title = `${this.$route.meta.title} - ${this.space.name} - ${this.configuration.currentTheme.general.name}`
    this.$route.params.name = this.space.name

    const loadSpaceEventToken = bus.subscribe('app.files.list.load', (path) => {
      this.loadResourcesTask.perform(this, this.$route.params.item === path, path)
    })

    this.$on('beforeDestroy', () => {
      bus.unsubscribe('app.files.list.load', loadSpaceEventToken)
    })
  },
  beforeDestroy() {
    visibilityObserver.disconnect()

    if (this.$refs.markdownContainer) {
      this.markdownResizeObserver.unobserve(this.$refs.markdownContainer)
    }
  },
  methods: {
    ...mapActions('Files', ['loadIndicators', 'loadPreview', 'loadCurrentFileOutgoingShares']),
    ...mapMutations('runtime/spaces', ['UPSERT_SPACE']),
    ...mapMutations('Files', [
      'SET_CURRENT_FOLDER',
      'LOAD_FILES',
      'CLEAR_CURRENT_FILES_LIST',
      'REMOVE_FILES',
      'REMOVE_FILES_FROM_SEARCHED',
      'REMOVE_FILE_SELECTION'
    ]),
    async fileDropped(fileIdTarget) {
      const selected = [...this.selectedResources]
      const targetInfo = this.paginatedResources.find((e) => e.id === fileIdTarget)
      const isTargetSelected = selected.some((e) => e.id === fileIdTarget)
      if (isTargetSelected) return
      if (targetInfo.type !== 'folder') return
      const movedResources = await move(
        selected,
        targetInfo,
        this.$client,
        this.createModal,
        this.hideModal,
        this.showMessage,
        this.$gettext,
        this.$gettextInterpolate,
        this.$ngettext,
        false
      )
      for (const resource of movedResources) {
        this.REMOVE_FILES([resource])
        this.REMOVE_FILES_FROM_SEARCHED([resource])
        this.REMOVE_FILE_SELECTION(resource)
      }
    },
    rowMounted(resource, component) {
      if (!this.displayThumbnails) {
        return
      }

      const debounced = debounce(({ unobserve }) => {
        unobserve()
        this.loadPreview({
          resource,
          isPublic: false,
          dimensions: ImageDimension.Thumbnail,
          type: ImageType.Thumbnail
        })
      }, 250)

      visibilityObserver.observe(component.$el, { onEnter: debounced, onExit: debounced.cancel })
    },
    toggleCollapseMarkdown() {
      this.markdownCollapsed = !this.markdownCollapsed
      return this.$refs.markdownContainer.classList.toggle(this.markdownContainerCollapsedClass)
    },
    toggleImageExpanded() {
      this.imageExpanded = !this.imageExpanded
    },
    onMarkdownResize() {
      if (!this.$refs.markdownContainer) {
        return
      }

      this.$refs.markdownContainer.classList.remove(this.markdownContainerCollapsedClass)
      const markdownContainerHeight = this.$refs.markdownContainer.offsetHeight

      if (markdownContainerHeight < 150) {
        return (this.showMarkdownCollapse = false)
      }

      this.showMarkdownCollapse = true

      if (this.markdownCollapsed) {
        this.$refs.markdownContainer.classList.add(this.markdownContainerCollapsedClass)
      }
    },
    openSidebarSharePanel() {
      this.selectedResources = [this.space]
      bus.publish(SideBarEventTopics.openWithPanel, 'space-share-item')
    }
  }
})
</script>

<style lang="scss">
.space-overview {
  &-image {
    border-radius: 10px;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }

  &-image.expanded {
    max-height: 100%;
    max-width: 100%;
  }

  &-name {
    font-size: 1.5rem;
  }

  &-people-count {
    white-space: nowrap;
  }

  .markdown-container.collapsed {
    max-height: 150px;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(180deg, #000 90%, transparent);
  }
}
</style>
