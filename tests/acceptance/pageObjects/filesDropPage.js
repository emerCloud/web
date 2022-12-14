const { join } = require('../helpers/path')

module.exports = {
  url: function () {
    return join(this.api.launchUrl, '/files/public/drop/')
  },
  commands: {
    /**
     * like build-in navigate() but also waits till for the progressbar to appear and disappear
     * @returns {*}
     */
    navigateAndWaitTillLoaded: function (token) {
      this.navigate(this.url() + token)
      return this.waitForElementPresent('@fileDropzone')
    },
    navigateAndWaitForPasswordPage: function (token) {
      this.navigate(this.url() + token)
      return this.page.publicLinkPasswordPage().waitForElementPresent('@passwordInput')
    },
    /**
     * @return {Promise}
     */
    waitForPage: function () {
      return this.api.waitForElementVisible(this.elements.fileDropzone)
    },
    /**
     * Upload file from given path
     *
     * @param {string} path - absolute path of the file to upload
     * @returns {Promise}
     */
    uploadFile: function (path) {
      return this.api.setValue(this.elements.fileUploadInput.selector, path)
    },
    /**
     * Get the list of uploaded files
     */
    getUploadedFiles: async function () {
      let elements = []
      await this.waitForElementVisible('@uploadInfoSuccessLabel')
        .click('@toggleUploadDetailsButton')
        .waitForElementVisible('@uploadedFiles')

      await this.api.elements('@uploadedFiles', (result) => {
        elements = result.value
      })

      const files = []
      for (const { ELEMENT } of elements) {
        await this.api.elementIdText(ELEMENT, function (result) {
          files.push(result.value.replace('\n', ''))
        })
      }
      return files
    }
  },
  elements: {
    fileUploadInput: {
      selector: 'input[type=file]',
      locateStrategy: 'css selector'
    },
    toggleUploadDetailsButton: {
      selector: '.upload-info-toggle-details-btn',
      locateStrategy: 'css selector'
    },
    uploadInfoSuccessLabel: {
      selector: '.upload-info-success',
      locateStrategy: 'css selector'
    },
    uploadedFiles: {
      selector: '.upload-info-items span.oc-resource-name',
      locateStrategy: 'css selector'
    },
    fileDropzone: {
      selector: '#files-drop-container',
      locateStrategy: 'css selector'
    }
  }
}
