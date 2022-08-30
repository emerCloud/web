<template>
  <SideBar
    v-if="showSidebar"
    ref="sidebar"
    class="files-side-bar"
    tabindex="-1"
    :sidebar-active-panel="sidebarActivePanel"
    :available-panels="availablePanels"
    :sidebar-accordions-warning-message="sidebarAccordionsWarningMessage"
    :is-content-displayed="isContentDisplayed"
    :loading="loading"
    :is-header-compact="isSingleResource"
    v-bind="$attrs"
    @beforeDestroy="destroySideBar"
    @mounted="focusSideBar"
    @fileChanged="focusSideBar"
    @selectPanel="setActiveSideBarPanel"
    @close="closeSideBar"
    v-on="$listeners"
  >
    <template #header>
      <file-info
        v-if="isSingleResource && !highlightedFileIsSpace"
        class="sidebar-panel__file_info"
        :is-content-displayed="isContentDisplayed"
      />
      <space-info v-if="highlightedFileIsSpace" class="sidebar-panel__space_info" />
    </template>
  </SideBar>
</template>

<script lang="ts">
import { mapGetters, mapState } from 'vuex'
import SideBar from 'web-pkg/src/components/sidebar/SideBar.vue'
import { Panel } from 'web-pkg/src/components/sidebar/types'

import {
  isLocationPublicActive,
  isLocationSharesActive,
  isLocationSpacesActive
} from '../../router'
import { computed, defineComponent } from '@vue/composition-api'

import FileInfo from './FileInfo.vue'
import SpaceInfo from './SpaceInfo.vue'
import {
  useCapabilityShareJailEnabled,
  usePublicLinkPassword,
  useStore
} from 'web-pkg/src/composables'

export default defineComponent({
  components: { FileInfo, SpaceInfo, SideBar },

  provide() {
    return {
      displayedItem: computed(() => this.highlightedFile)
    }
  },

  setup() {
    const store = useStore()

    const showSidebar = computed(() => !store.getters['Files/sidebar/closed'])
    const sidebarActivePanel = computed(() => store.getters['Files/sidebar/activePanel'])

    const closeSideBar = () => {
      store.dispatch('Files/sidebar/close')
    }
    const setActiveSideBarPanel = (panelName) => {
      store.dispatch('Files/sidebar/setActivePanel', panelName)
    }

    const focusSideBar = (component, event) => {
      component.focus({
        from: document.activeElement,
        to: component.sidebar?.$el,
        revert: event === 'beforeDestroy'
      })
    }

    const destroySideBar = (component, event) => {
      focusSideBar(component, event)
      closeSideBar()
    }

    return {
      hasShareJail: useCapabilityShareJailEnabled(),
      publicLinkPassword: usePublicLinkPassword({ store }),
      showSidebar,
      sidebarActivePanel,
      setActiveSideBarPanel,
      closeSideBar,
      destroySideBar,
      focusSideBar
    }
  },

  data() {
    return {
      focused: undefined,
      oldPanelName: null,
      loading: false
    }
  },

  computed: {
    ...mapGetters('Files', ['highlightedFile', 'selectedFiles']),
    ...mapGetters(['fileSideBars', 'capabilities']),
    ...mapState(['user']),
    availablePanels(): Panel[] {
      const { panels } = this.fileSideBars.reduce(
        (result, panelGenerator) => {
          const panel = panelGenerator({
            capabilities: this.capabilities,
            highlightedFile: this.highlightedFile,
            route: this.$route,
            router: this.$router,
            multipleSelection: this.areMultipleSelected,
            rootFolder: this.isRootFolder,
            user: this.user
          })

          if (panel.enabled) {
            result.panels.push(panel)
          }

          return result
        },
        { panels: [] }
      )

      return panels
    },
    isShareAccepted() {
      return this.highlightedFile?.status === 0
    },
    isContentDisplayed() {
      return isLocationSharesActive(this.$router, 'files-shares-with-me')
        ? this.isShareAccepted
        : true
    },
    sidebarAccordionsWarningMessage() {
      if (!this.isShareAccepted) {
        return this.$gettext('Please, accept this share first to display available actions')
      }

      return null
    },
    isSingleResource() {
      return !this.areMultipleSelected && (!this.isRootFolder || this.highlightedFileIsSpace)
    },
    areMultipleSelected() {
      return this.selectedFiles && this.selectedFiles.length > 1
    },
    isRootFolder() {
      const pathSegments = this.highlightedFile?.path?.split('/').filter(Boolean) || []
      if (isLocationPublicActive(this.$router, 'files-public-files')) {
        // root node of a public link has the public link token as path
        // root path `/` like for personal home doesn't exist for public links
        return pathSegments.length === 1
      }
      if (isLocationSharesActive(this.$router, 'files-shares-with-me')) {
        return !this.highlightedFile
      }
      if (this.hasShareJail && isLocationSpacesActive(this.$router, 'files-spaces-share')) {
        return false
      }
      return !pathSegments.length
    },
    highlightedFileIsSpace() {
      return this.highlightedFile?.type === 'space'
    }
  }
})
</script>

<style lang="scss">
.files-side-bar {
  z-index: 3;

  .sidebar-panel {
    &__file_info,
    &__space_info {
      background-color: var(--oc-color-background-default);
      padding: var(--oc-space-small) var(--oc-space-small) 0 var(--oc-space-small);
    }
  }

  ._clipboard-success-animation {
    animation-name: _clipboard-success-animation;
    animation-duration: 0.8s;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }
}

@keyframes _clipboard-success-animation {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
  }
}
</style>
