<template>
  <div class="files-search-preview">
    <oc-resource
      :resource="resource"
      :is-path-displayed="true"
      :folder-link="folderLink(resource)"
      :parent-folder-link="parentFolderLink(resource)"
      :parent-folder-name-default="defaultParentFolderName"
      :is-thumbnail-displayed="displayThumbnails"
      @click="$_fileActions_triggerDefaultAction(resource)"
    />
  </div>
</template>

<script lang="ts">
import MixinFileActions from '../../mixins/fileActions'
import { VisibilityObserver } from 'web-pkg/src/observer'
import { ImageDimension, ImageType } from '../../constants'
import { loadPreview } from 'web-pkg/src/helpers/preview'
import debounce from 'lodash-es/debounce'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import { createLocationSpaces } from '../../router'
import path from 'path'
import { useAccessToken, useCapabilityShareJailEnabled, useStore } from 'web-pkg/src/composables'

const visibilityObserver = new VisibilityObserver()

export default {
  mixins: [MixinFileActions],
  props: {
    searchResult: {
      type: Object,
      default: function () {
        return {}
      }
    },
    provider: {
      type: Object,
      default: function () {
        return {}
      }
    }
  },
  setup() {
    const store = useStore()
    return {
      hasShareJail: useCapabilityShareJailEnabled(),
      resourceTargetLocation: createLocationSpaces('files-spaces-personal', {
        params: { storageId: store.getters.user.id }
      }),
      resourceTargetLocationSpace: createLocationSpaces('files-spaces-project'),
      accessToken: useAccessToken({ store })
    }
  },
  data() {
    return {
      resource: undefined
    }
  },
  computed: {
    ...mapGetters(['configuration', 'user']),
    ...mapState('runtime/spaces', ['spaces']),

    matchingSpace() {
      return this.spaces.find((space) => space.id === this.resource.storageId)
    },
    defaultParentFolderName() {
      if (!this.hasShareJail) {
        return this.$gettext('All files and folders')
      }

      if (this.matchingSpace?.driveType === 'project') {
        return this.matchingSpace.name
      }

      return this.$gettext('Personal')
    },
    displayThumbnails() {
      return !this.configuration?.options?.disablePreviews
    }
  },
  beforeMount() {
    this.resource = this.searchResult.data
  },
  mounted() {
    if (!this.displayThumbnails) {
      return
    }

    const debounced = debounce(async ({ unobserve }) => {
      unobserve()
      const preview = await loadPreview(
        {
          resource: this.resource,
          isPublic: false,
          dimensions: ImageDimension.Thumbnail,
          server: this.configuration.server,
          userId: this.user.id,
          token: this.accessToken
        },
        true
      )
      preview && Vue.set(this.resource, ImageType.Thumbnail, preview)
    }, 250)

    visibilityObserver.observe(this.$el, { onEnter: debounced, onExit: debounced.cancel })
  },
  beforeDestroy() {
    visibilityObserver.disconnect()
  },
  methods: {
    folderLink(file) {
      return this.createFolderLink(file.path, file.storageId)
    },
    parentFolderLink(file) {
      return this.createFolderLink(path.dirname(file.path), file.storageId)
    },
    createFolderLink(path, storageId) {
      if (this.resourceTargetLocation === null || this.resourceTargetLocationSpace === null) {
        return {}
      }

      if (this.matchingSpace?.driveType === 'project') {
        return createLocationSpaces('files-spaces-project', {
          params: { storageId, item: path.replace(/^\//, '') || undefined }
        })
      }

      return {
        name: this.resourceTargetLocation.name,
        params: {
          item: path.replace(/^\//, '') || undefined,
          ...this.resourceTargetLocation.params,
          ...(storageId && { storageId })
        }
      }
    }
  }
}
</script>
