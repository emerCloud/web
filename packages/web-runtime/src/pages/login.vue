<template>
  <div
    v-if="initialized"
    class="oc-login oc-height-viewport"
    :style="{ backgroundImage: 'url(' + backgroundImg + ')' }"
  >
    <h1 class="oc-invisible-sr">{{ pageTitle }}</h1>
    <div class="oc-login-card oc-position-center">
      <img class="oc-login-logo" :src="logoImg" alt="" :aria-hidden="true" />
      <div class="oc-login-card-body">
        <h2 class="oc-login-card-title">
          <translate :translate-params="{ productName: $_productName }"
            >Welcome to %{productName}</translate
          >
        </h2>
        <p v-translate>
          Please click the button below to authenticate and get access to your data.
        </p>
        <oc-button
          id="authenticate"
          size="large"
          variation="primary"
          appearance="filled"
          class="oc-login-authorize-button"
          @click="performLogin"
        >
          <translate>Login</translate>
        </oc-button>
      </div>
      <div class="oc-login-card-footer">
        <p>
          {{ configuration.currentTheme.general.slogan }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { authService } from '../services/auth'
import { queryItemAsString, useRouteQuery } from 'web-pkg/src/composables'
export default {
  name: 'LoginPage',
  setup() {
    return {
      redirectUrl: useRouteQuery('redirectUrl')
    }
  },
  data() {
    return {
      loading: false,
      initialized: false
    }
  },
  computed: {
    ...mapGetters(['configuration']),

    pageTitle() {
      return this.$gettext(this.$route.meta.title)
    },

    $_productName() {
      return this.configuration.currentTheme.general.name
    },

    logoImg() {
      return this.configuration.currentTheme.logo.login
    },

    backgroundImg() {
      return this.configuration.currentTheme.loginPage.backgroundImg
    }
  },

  created() {
    if (this.configuration.currentTheme.loginPage.autoRedirect) {
      this.performLogin()
    } else {
      this.initialized = true
    }
  },

  methods: {
    performLogin() {
      authService.loginUser(queryItemAsString(this.redirectUrl))
    }
  }
}
</script>
