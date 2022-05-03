import Uppy from '@uppy/core'
import { TusOptions } from '@uppy/tus'
import XHRUpload, { XHRUploadOptions } from '@uppy/xhr-upload'
import { bus } from 'web-pkg/src/instance'
import { UppyResource } from '../composables/upload'
import { CustomDropTarget } from '../composables/upload/uppyPlugins/customDropTarget'
import { CustomTus } from '../composables/upload/uppyPlugins/customTus'

type UppyServiceTopics =
  | 'uploadStarted'
  | 'uploadCancelled'
  | 'uploadCompleted'
  | 'uploadRemoved'
  | 'uploadSuccess'
  | 'uploadError'
  | 'fileAdded'
  | 'filesSelected'
  | 'progress'
  | 'addedForUpload'

export class UppyService {
  uppy: Uppy
  uploadInputs: HTMLInputElement[] = []

  constructor() {
    this.uppy = new Uppy({
      autoProceed: true
    })
    this.setUpEvents()
  }

  useTus({
    tusMaxChunkSize,
    uploadChunkSize,
    tusHttpMethodOverride,
    headers
  }: {
    tusMaxChunkSize: number
    uploadChunkSize: number
    tusHttpMethodOverride: boolean
    headers: { [key: string]: string }
  }) {
    const chunkSize =
      tusMaxChunkSize > 0 && uploadChunkSize !== Infinity
        ? Math.max(tusMaxChunkSize, uploadChunkSize)
        : uploadChunkSize

    const tusPluginOptions = {
      headers: headers,
      chunkSize: chunkSize,
      removeFingerprintOnSuccess: true,
      overridePatchMethod: !!tusHttpMethodOverride,
      retryDelays: [0, 500, 1000]
    }

    const xhrPlugin = this.uppy.getPlugin('XHRUpload')
    if (xhrPlugin) {
      this.uppy.removePlugin(xhrPlugin)
    }

    const tusPlugin = this.uppy.getPlugin('Tus')
    if (tusPlugin) {
      tusPlugin.setOptions(tusPluginOptions)
      return
    }

    this.uppy.use(CustomTus, tusPluginOptions as TusOptions)
  }

  useXhr({ headers }: { headers: { [key: string]: string } }) {
    const xhrPluginOptions: XHRUploadOptions = {
      endpoint: '',
      method: 'put',
      headers,
      formData: false,
      getResponseData() {
        return {}
      }
    }

    const tusPlugin = this.uppy.getPlugin('Tus')
    if (tusPlugin) {
      this.uppy.removePlugin(tusPlugin)
    }

    const xhrPlugin = this.uppy.getPlugin('XHRUpload')
    if (xhrPlugin) {
      xhrPlugin.setOptions(xhrPluginOptions)
      return
    }

    this.uppy.use(XHRUpload, xhrPluginOptions)
  }

  tusActive() {
    return !!this.uppy.getPlugin('Tus')
  }

  useDropTarget({
    targetSelector,
    uppyService
  }: {
    targetSelector: string
    uppyService: UppyService
  }) {
    if (this.uppy.getPlugin('DropTarget')) {
      return
    }
    this.uppy.use(CustomDropTarget, {
      target: targetSelector,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      uppyService
    })
  }

  removeDropTarget() {
    const dropTargetPlugin = this.uppy.getPlugin('DropTarget')
    if (dropTargetPlugin) {
      this.uppy.removePlugin(dropTargetPlugin)
    }
  }

  subscribe(topic: UppyServiceTopics, callback: (data?: unknown) => void): string {
    return bus.subscribe(topic, callback)
  }

  unsubscribe(topic: UppyServiceTopics, token: string): void {
    bus.unsubscribe(topic, token)
  }

  publish(topic: UppyServiceTopics, data?: unknown): void {
    bus.publish(topic, data)
  }

  private setUpEvents() {
    this.uppy.on('progress', (value) => {
      this.publish('progress', value)
    })
    this.uppy.on('cancel-all', () => {
      this.publish('uploadCancelled')
    })
    this.uppy.on('complete', (result) => {
      this.publish('uploadCompleted', result)
      result.successful.forEach((file) => {
        this.uppy.removeFile(file.id)
      })
      this.clearInputs()
    })
    this.uppy.on('upload-success', (file) => {
      this.publish('uploadSuccess', file)
    })
    this.uppy.on('upload-error', (file) => {
      this.publish('uploadError', file)
    })
    this.uppy.on('file-removed', () => {
      this.publish('uploadRemoved')
      this.clearInputs()
    })
    this.uppy.on('file-added', (file) => {
      this.publish('fileAdded')
      const addedFile = file as unknown as UppyResource
      if (this.uppy.getPlugin('XHRUpload')) {
        const escapedName = encodeURIComponent(addedFile.name)
        this.uppy.setFileState(addedFile.id, {
          xhrUpload: {
            endpoint: `${addedFile.meta.tusEndpoint.replace(/\/+$/, '')}/${escapedName}`
          }
        })
      }
    })
  }

  registerUploadInput(el: HTMLInputElement) {
    const listenerRegistered = el.getAttribute('listener')
    if (listenerRegistered !== 'true') {
      el.setAttribute('listener', 'true')
      el.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement
        const files = Array.from(target.files)
        this.publish('filesSelected', files)
      })
      this.uploadInputs.push(el)
    }
  }

  removeUploadInput(el: HTMLInputElement) {
    this.uploadInputs = this.uploadInputs.filter((input) => input !== el)
  }

  uploadFiles(files: UppyResource[]) {
    files.forEach((file) => {
      try {
        this.uppy.addFile(file)
      } catch (err) {
        console.error('error upload file:', file)
        if (err.isRestriction) {
          // handle restrictions
          console.error('Restriction error:', err)
        } else {
          // handle other errors
          console.error(err)
        }
      }
    })
  }

  retryAllUploads() {
    return this.uppy.retryAll()
  }

  pauseAllUploads() {
    return this.uppy.pauseAll()
  }

  resumeAllUploads() {
    return this.uppy.resumeAll()
  }

  cancelAllUploads() {
    return this.uppy.cancelAll()
  }

  clearInputs() {
    this.uploadInputs.forEach((item) => {
      item.value = null
    })
  }
}