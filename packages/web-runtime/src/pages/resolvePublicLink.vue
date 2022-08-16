<template>
  <div class="oc-height-1-1 oc-link-resolve">
    <h1 class="oc-invisible-sr">{{ pageTitle }}</h1>
    <div class="oc-card oc-border oc-rounded oc-position-center oc-text-center oc-width-large">
      <template
        v-if="
          loadTokenInfoTask.isRunning ||
          !loadTokenInfoTask.last ||
          isPasswordRequiredTask.isRunning ||
          !isPasswordRequiredTask.last
        "
      >
        <div class="oc-card-header">
          <h2 key="public-link-loading">
            <translate>Loading public link…</translate>
          </h2>
        </div>
        <div class="oc-card-body">
          <oc-spinner :aria-hidden="true" />
        </div>
      </template>
      <template v-else-if="loadTokenInfoTask.isError || isPasswordRequiredTask.isError">
        <div class="oc-card-header oc-link-resolve-error-title">
          <h2 key="public-link-error">
            <translate>An error occurred while loading the public link</translate>
          </h2>
        </div>
        <div class="oc-card-body oc-link-resolve-error-message">
          <p v-if="loadTokenInfoTask.isError" class="oc-text-xlarge">
            {{ loadTokenInfoTask.last.error }}
          </p>
          <p v-if="loadTokenInfoTask.isError" class="oc-text-xlarge">
            {{ loadTokenInfoTask.last.error }}
          </p>
        </div>
      </template>
      <template v-else-if="isPasswordRequiredTask.last && isPasswordRequiredTask.last.value">
        <form @submit.prevent="resolvePublicLink(true)">
          <div class="oc-card-header">
            <h2>
              <translate>This resource is password-protected</translate>
            </h2>
          </div>
          <div class="oc-card-body">
            <oc-text-input
              ref="passwordInput"
              v-model="password"
              :error-message="wrongPasswordMessage"
              :label="passwordFieldLabel"
              type="password"
              class="oc-mb-s"
            />
            <oc-button
              variation="primary"
              appearance="filled"
              class="oc-login-authorize-button"
              :disabled="!password"
              submit="submit"
            >
              <translate>Continue</translate>
            </oc-button>
          </div>
        </form>
      </template>
      <div class="oc-card-footer">
        <p>
          {{ configuration.currentTheme.general.slogan }}
        </p>
      </div>
    </div>
  </div>
</template>

<script type="ts">
import { mapGetters } from 'vuex'
import { DavProperties, DavProperty } from "web-pkg/src/constants";
import { SharePermissionBit } from 'web-client/src/helpers/share'
import { authService } from "../services/auth";

import {
  queryItemAsString,
  useClientService,
  useRouteParam,
  useRouteQuery,
  useStore
} from 'web-pkg/src/composables'
import { useTask } from 'vue-concurrency'
import { ref, unref, computed, defineComponent } from "@vue/composition-api";

export default defineComponent({
  name: 'ResolvePublicLink',
  setup() {
    const { owncloudSdk } = useClientService()
    const store = useStore()
    const token = useRouteParam('token')
    const password = ref('')
    const tokenInfo = ref({})
    const isLoggedInUser = computed(() => {
      return !!store.getters.user?.id
    })
    const isPasswordRequiredTask = useTask(function* (signal) {
      if (unref(tokenInfo)) {
        return unref(tokenInfo).password_protected === 'true'
      }

      try {
        yield owncloudSdk.publicFiles.list(unref(token), '', DavProperties.PublicLink, '0')
        return false
      } catch (error) {
        if (error.statusCode === 401) {
          return true
        }
        throw error
      }
    })
    const loadTokenInfoTask = useTask(function* (signal, ref) {
      let tokenInfo
      try {
        if (unref(isLoggedInUser)) {
          tokenInfo = yield owncloudSdk.shares.getProtectedTokenInfo(unref(token))
        } else {
          tokenInfo = yield owncloudSdk.shares.getUnprotectedTokenInfo(unref(token))
        }
      } catch (e) { } // oC10

      ref.tokenInfo = tokenInfo
    })
    const loadPublicLinkTask = useTask(function* (signal) {
      const files = yield owncloudSdk.publicFiles.list(
        unref(token),
        unref(password),
        DavProperties.PublicLink,
        '0'
      )
      return files[0]
    })
    const wrongPassword = computed(() => {
      if (loadPublicLinkTask.isError) {
        return loadPublicLinkTask.last.error.statusCode === 401
      }
      return false
    })
    return {
      redirectUrl: useRouteQuery('redirectUrl'),
      token,
      password,
      loadTokenInfoTask,
      isPasswordRequiredTask,
      loadPublicLinkTask,
      wrongPassword,
      isLoggedInUser,
      tokenInfo
    }
  },
  computed: {
    ...mapGetters(['configuration']),

    pageTitle() {
      return this.$gettext(this.$route.meta.title)
    },

    passwordFieldLabel() {
      return this.$gettext('Enter password for public link')
    },

    wrongPasswordMessage() {
      if (this.wrongPassword) {
        return this.$gettext('Incorrect password')
      }
      return null
    }
  },
  async mounted() {
    await this.loadTokenInfoTask.perform(this)
    const passwordProtected = await this.isPasswordRequiredTask.perform()
    if (!passwordProtected) {
      await this.resolvePublicLink(false)
    }
  },
  methods: {
    async resolvePublicLink(passwordRequired) {
      let publicLink

      if (this.tokenInfo && !passwordRequired) {
        const fullPath = this.tokenInfo.storage_id + '$' + this.tokenInfo.space_id + '!' + this.tokenInfo.opaque_id

        try {
          publicLink = await this.loadPublicLinkTask.perform()
        } catch (error) {
          if (error.statusCode !== 404) {
            throw error
          }
          // alias link
          if (!this.isLoggedInUser) {
            await authService.loginUser(queryItemAsString(`/files/spaces/personal/${fullPath}`))
            return this.$router.push({ name: '/login' })
          }

          return this.$router.push({ name: 'files-spaces-personal', params: { storageId: fullPath } })
        }
      } else {
        publicLink = await this.loadPublicLinkTask.perform()
      }

      if (this.loadPublicLinkTask.isError) {
        return
      }

      const password = passwordRequired ? this.password : ''
      await authService.resolvePublicLink(this.token, passwordRequired, password)

      const redirectUrl = queryItemAsString(this.redirectUrl)
      if (redirectUrl) {
        return this.$router.push({ path: redirectUrl })
      }

      if (parseInt(publicLink.fileInfo[DavProperty.PublicLinkPermission]) === SharePermissionBit.Create) {
        return this.$router.push({ name: 'files-public-drop', params: { token: this.token } })
      }

      return this.$router.push({ name: 'files-public-files', params: { item: this.token } })
    }
  }
})
</script>

<style lang="scss">
.oc-link-resolve {
  .oc-text-input-message {
    justify-content: center;
  }

  .oc-card-header h2,
  .oc-card-footer p {
    margin: 0;
  }
}
</style>
