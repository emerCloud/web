<template>
  <div v-if="group" class="oc-mt-xl">
    <div class="oc-flex group-info oc-mb-l">
      <avatar-image class="oc-mb-m" :width="80" :userid="group.id" :user-name="group.displayName" />
      <span class="oc-text-muted group-info-display-name" v-text="group.displayName"></span>
    </div>
    <div v-if="editGroup" class="oc-background-highlight oc-p-m">
      <oc-text-input
        v-model="editGroup.displayName"
        class="oc-mb-s"
        :label="$gettext('Group name')"
        :error-message="formData.displayName.errorMessage"
        :fix-message-line="true"
        @input="validateDisplayName"
      />
    </div>
    <compare-save-dialog
      class="edit-compare-save-dialog"
      :original-object="group"
      :compare-object="editGroup"
      :confirm-button-disabled="invalidFormData"
      @revert="revertChanges"
      @confirm="$emit('confirm', editGroup)"
    ></compare-save-dialog>
  </div>
</template>
<script>
import CompareSaveDialog from 'web-pkg/src/components/sideBar/CompareSaveDialog.vue'

export default {
  name: 'EditPanel',
  components: {
    CompareSaveDialog
  },
  props: {
    groups: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      editGroup: {},
      formData: {
        displayName: {
          errorMessage: '',
          valid: true
        }
      }
    }
  },
  computed: {
    group() {
      return this.groups.length === 1 ? this.groups[0] : null
    },

    invalidFormData() {
      return Object.values(this.formData)
        .map((v) => !!v.valid)
        .includes(false)
    }
  },
  watch: {
    group: {
      handler: function () {
        this.editGroup = { ...this.group }
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    validateDisplayName() {
      this.formData.displayName.valid = false

      if (this.editGroup.displayName.trim() === '') {
        this.formData.displayName.errorMessage = this.$gettext('Display name cannot be empty')
        return false
      }

      this.formData.displayName.errorMessage = ''
      this.formData.displayName.valid = true
      return true
    },

    revertChanges() {
      this.editGroup = { ...this.group }
      Object.values(this.formData).forEach((formDataValue) => {
        formDataValue.valid = true
        formDataValue.errorMessage = ''
      })
    }
  }
}
</script>
<style lang="scss">
.edit-compare-save-dialog {
  position: absolute;
  bottom: 0;
  left: 0;
}

.group-info {
  align-items: center;
  flex-direction: column;
}
.group-info-display-name {
  font-size: 1.5rem;
}
</style>
