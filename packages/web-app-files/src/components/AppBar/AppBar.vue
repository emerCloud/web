<template>
  <div id="files-app-bar" ref="filesAppBar" :class="{ 'files-app-bar-squashed': sideBarOpen }">
    <oc-hidden-announcer :announcement="selectedResourcesAnnouncement" level="polite" />
    <div class="files-topbar oc-py-s">
      <h1 class="oc-invisible-sr" v-text="pageTitle" />
      <div
        class="oc-flex"
        :class="{
          'oc-flex-between': breadcrumbs.length || hasSharesNavigation,
          'oc-flex-right': !breadcrumbs.length && !hasSharesNavigation
        }"
      >
        <oc-breadcrumb
          v-if="breadcrumbs.length"
          id="files-breadcrumb"
          data-testid="files-breadcrumbs"
          class="oc-flex oc-flex-middle"
          context-menu-padding="small"
          :items="breadcrumbs"
        >
          <template #contextMenu>
            <context-actions
              v-if="showContextActions"
              :items="breadcrumbsContextActionsItems.filter(Boolean)"
            />
          </template>
        </oc-breadcrumb>
        <shares-navigation v-if="hasSharesNavigation" />
        <div v-if="hasViewOptions || hasSidebarToggle" class="oc-flex">
          <view-options v-if="hasViewOptions" />
          <sidebar-toggle v-if="hasSidebarToggle" />
        </div>
      </div>
      <div class="files-app-bar-actions">
        <div class="oc-flex-1 oc-flex oc-flex-start">
          <slot
            v-if="showActionsOnSelection || selectedFiles.length === 0"
            name="actions"
            :limitedScreenSpace="limitedScreenSpace"
          />
          <batch-actions v-if="showBatchActions" :show-tooltips="limitedScreenSpace" />
        </div>
      </div>
      <slot name="content" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState, mapMutations } from 'vuex'
import last from 'lodash-es/last'

import MixinFileActions from '../../mixins/fileActions'

import BatchActions from './SelectedResources/BatchActions.vue'
import ContextActions from '../FilesList/ContextActions.vue'
import SharesNavigation from './SharesNavigation.vue'
import SidebarToggle from './SidebarToggle.vue'
import ViewOptions from './ViewOptions.vue'

export default {
  components: {
    BatchActions,
    ContextActions,
    SharesNavigation,
    SidebarToggle,
    ViewOptions
  },
  mixins: [MixinFileActions],
  props: {
    breadcrumbs: { type: Array, default: () => [] },
    breadcrumbsContextActionsItems: { type: Array, default: () => [] },
    hasBulkActions: { type: Boolean, default: false },
    hasSharesNavigation: { type: Boolean, default: false },
    hasSidebarToggle: { type: Boolean, default: true },
    hasViewOptions: { type: Boolean, default: true },
    showActionsOnSelection: { type: Boolean, default: false },
    sideBarOpen: { type: Boolean, default: false }
  },
  data: function () {
    return {
      resizeObserver: new ResizeObserver(this.onResize),
      limitedScreenSpace: false
    }
  },
  computed: {
    ...mapGetters('Files', ['files', 'selectedFiles']),
    ...mapState('Files', ['areHiddenFilesShown', 'areFileExtensionsShown']),

    pageTitle() {
      const title = this.$route.meta.title
      return this.$gettext(title)
    },
    showContextActions() {
      return last(this.breadcrumbs).allowContextActions
    },
    showBatchActions() {
      return this.hasBulkActions
    },
    selectedResourcesAnnouncement() {
      if (this.selectedFiles.length === 0) {
        return this.$gettext('No items selected.')
      }
      const translated = this.$ngettext(
        '%{ amount } item selected. Actions are available above the table.',
        '%{ amount } items selected. Actions are available above the table.',
        this.selectedFiles.length
      )
      return this.$gettextInterpolate(translated, { amount: this.selectedFiles.length })
    }
  },
  mounted() {
    this.resizeObserver.observe(this.$refs.filesAppBar)
  },
  beforeDestroy() {
    this.resizeObserver.unobserve(this.$refs.filesAppBar)
  },

  created() {
    // Storage returns a string so we need to convert it into a boolean
    const areHiddenFilesShown = window.localStorage.getItem('oc_hiddenFilesShown') || 'false'
    const areHiddenFilesShownBoolean = areHiddenFilesShown === 'true'

    if (areHiddenFilesShownBoolean !== this.areHiddenFilesShown) {
      this.SET_HIDDEN_FILES_VISIBILITY(areHiddenFilesShownBoolean)
    }

    // Storage returns a string so we need to convert it into a boolean
    const areFileExtensionsShown = window.localStorage.getItem('oc_fileExtensionsShown') || 'true'
    const areFileExtensionsShownBoolean = areFileExtensionsShown === 'true'

    if (areFileExtensionsShownBoolean !== this.areFileExtensionsShown) {
      this.SET_FILE_EXTENSIONS_VISIBILITY(areFileExtensionsShownBoolean)
    }
  },

  methods: {
    ...mapMutations('Files', ['SET_HIDDEN_FILES_VISIBILITY', 'SET_FILE_EXTENSIONS_VISIBILITY']),

    onResize() {
      this.limitedScreenSpace = this.sideBarOpen
        ? window.innerWidth <= 1280
        : window.innerWidth <= 1000
    }
  }
}
</script>

<style lang="scss" scoped>
#files-app-bar {
  background-color: var(--oc-color-background-default);
  border-top-right-radius: 15px;
  box-sizing: border-box;
  z-index: 2;
  position: sticky;
  padding: 0 var(--oc-space-medium);
  top: 0;

  .files-app-bar-actions {
    align-items: center;
    display: flex;
    gap: var(--oc-space-small);
    justify-content: flex-end;
    min-height: 3rem;
  }

  #files-breadcrumb {
    min-height: 2rem;
  }
}
</style>
