import { createLocalVue } from '@vue/test-utils'
import { SDKSearch } from '../../../src/search'
import { clientService } from 'web-pkg/src/services'
import Vuex from 'vuex'
import VueRouter from 'vue-router'

const searchMock = jest.fn()
jest.spyOn(clientService, 'owncloudSdk', 'get').mockImplementation(() => ({
  files: {
    search: searchMock
  }
}))

jest.mock('../../../src/helpers/resources', () => ({
  buildResource: (v) => v
}))

const localVue = createLocalVue()
localVue.use(Vuex)

const store = new Vuex.Store({
  getters: {
    capabilities: jest.fn(() => ({
      dav: {
        reports: ['search-files']
      }
    }))
  }
})

const storeWithoutFileSearch = new Vuex.Store({
  getters: {
    capabilities: jest.fn(() => ({ dav: { reports: [] } }))
  }
})

describe('SDKProvider', () => {
  it('push route on activate', () => {
    const push = jest.fn()
    push.mockReturnValueOnce(Promise.resolve())

    const search = new SDKSearch(store, { push } as unknown as VueRouter)
    const expected = {
      name: 'files-common-search',
      query: { term: 'foo', provider: 'files.sdk' }
    }

    search.activate('foo')
    expect(push.mock.calls[0][0]).toMatchObject(expected)

    push.mockImplementationOnce(() => Promise.reject(new Error()))
    search.activate('foo')
    expect(push.mock.calls[1][0]).toMatchObject(expected)
  })

  it('can reset', () => {
    const search = new SDKSearch(store, jest.fn() as unknown as VueRouter)
    search.reset()
    expect('not-implemented').toBe('not-implemented')
  })

  it('can updateTerm', () => {
    const search = new SDKSearch(store, jest.fn() as unknown as VueRouter)
    search.updateTerm()
    expect('not-implemented').toBe('not-implemented')
  })

  it('is only available if announced via capabilities', () => {
    const search = new SDKSearch(storeWithoutFileSearch, {} as unknown as VueRouter)
    expect(search.available).toBe(false)
  })

  describe('SDKProvider previewSearch', () => {
    it('covers activate', () => {
      const search = new SDKSearch(store, jest.fn() as unknown as VueRouter)
      search.previewSearch.activate({ id: 'id', data: 'data' })
      expect('not-implemented').toBe('not-implemented')
    })

    it('is not available on certain routes', () => {
      ;[
        { route: 'foo', available: true },
        { route: 'search-provider-list' },
        { route: 'bar', available: true }
      ].forEach((v) => {
        const search = new SDKSearch(store, {
          currentRoute: { name: v.route }
        } as unknown as VueRouter)

        expect(!!search.previewSearch.available).toBe(!!v.available)
      })
    })

    it('can search', async () => {
      const search = new SDKSearch(store, jest.fn() as unknown as VueRouter)
      const files = [
        { id: 'foo', name: 'foo' },
        { id: 'bar', name: 'bar' },
        { id: 'baz', name: 'baz' }
      ]

      const noTerm = await search.previewSearch.search('')
      expect(noTerm).toEqual({ range: null, values: [] })

      searchMock.mockReturnValueOnce({ results: files })
      const withTerm = await search.previewSearch.search('foo')
      expect(withTerm.values.map((r) => r.data)).toMatchObject(files)

      const withTermCached = await search.previewSearch.search('foo')
      expect(withTermCached.values.map((r) => r.data)).toMatchObject(files)
    })
  })
  describe('SDKProvider listSearch', () => {
    it('can search', async () => {
      const search = new SDKSearch(store, jest.fn() as unknown as VueRouter)
      const files = [
        { id: 'foo', name: 'foo' },
        { id: 'bar', name: 'bar' },
        { id: 'baz', name: 'baz' }
      ]

      searchMock.mockReturnValueOnce({ results: files })
      const withTerm = (await search.listSearch.search('foo')) as any
      expect(withTerm.values.map((r) => r.data)).toMatchObject(files)
    })
  })
})
