<template>
  <div class="oc-mt-xl">
    <UserInfoBox :user="user" />
    <div class="oc-background-highlight oc-p-m">
      <oc-select
        v-model="editUser.memberOf"
        multiple
        :options="groups"
        option-label="displayName"
        :label="$gettext('Add or remove groups')"
        :fix-message-line="true"
      >
        <template #selected-option="{ displayName, id }">
          <span class="oc-flex oc-flex-center">
            <avatar-image
              class="oc-flex oc-align-self-center oc-mr-s"
              :width="16.8"
              :userid="id"
              :user-name="displayName"
            />
            <span>{{ displayName }}</span>
          </span>
        </template>
        <template #option="{ displayName, id }">
          <div class="oc-flex">
            <span class="oc-flex oc-flex-center">
              <avatar-image
                class="oc-flex oc-align-self-center oc-mr-s"
                :width="16.8"
                :userid="id"
                :user-name="displayName"
              />
              <span>{{ displayName }}</span>
            </span>
          </div>
        </template>
      </oc-select>
    </div>
    <compare-save-dialog
      class="edit-compare-save-dialog"
      :original-object="user"
      :compare-object="editUser"
      @revert="revertChanges"
      @confirm="$emit('confirm', editUser)"
    ></compare-save-dialog>
  </div>
</template>
<script>
import UserInfoBox from './UserInfoBox.vue'
import CompareSaveDialog from 'web-pkg/src/components/sideBar/CompareSaveDialog.vue'

export default {
  name: 'GroupAssignmentsPanel',
  components: {
    UserInfoBox,
    CompareSaveDialog
  },
  props: {
    user: {
      type: Object,
      required: true
    },
    groups: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      editUser: {}
    }
  },
  watch: {
    user: {
      handler: function () {
        this.editUser = { ...this.user }
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    revertChanges() {
      this.editUser = { ...this.user }
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
</style>
