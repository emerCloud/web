import { HttpClient } from '../../http'
import { client, Graph, OCS } from 'web-client'
import { Auth, AuthParameters } from './auth'
import axios, { AxiosInstance } from 'axios'
import { v4 as uuidV4 } from 'uuid'

export type OwnCloudSdk = any
interface OcClient {
  token: string
  graph: Graph
  ocs: OCS
}

const createAxiosInstance = (authParams: AuthParameters): AxiosInstance => {
  const auth = new Auth(authParams)
  const axiosClient = axios.create({
    headers: auth.getHeaders()
  })
  axiosClient.interceptors.request.use((config) => {
    config.headers['X-Request-ID'] = uuidV4()
    config.headers['X-Requested-With'] = 'XMLHttpRequest'
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    return config
  })
  return axiosClient
}

export class ClientService {
  private httpAuthenticatedClient: {
    token: string
    instance: HttpClient
  }

  private httpUnAuthenticatedClient: HttpClient

  private ocUserContextClient: OcClient
  private ocPublicLinkContextClient: OcClient

  private owncloudSdkClient: OwnCloudSdk

  public httpAuthenticated(token: string): HttpClient {
    if (!this.httpAuthenticatedClient || this.httpAuthenticatedClient.token !== token) {
      this.httpAuthenticatedClient = {
        token,
        instance: new HttpClient({
          headers: {
            Authorization: 'Bearer ' + token,
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
      }
    }

    return this.httpAuthenticatedClient.instance
  }

  public graphAuthenticated(serverUrl: string, token: string): Graph {
    this.initOcUserContextClient(serverUrl, token)
    return this.ocUserContextClient.graph
  }

  public ocsUserContext(serverUrl: string, token: string): OCS {
    this.initOcUserContextClient(serverUrl, token)
    return this.ocUserContextClient.ocs
  }

  private initOcUserContextClient(serverUrl: string, token: string) {
    if (!this.ocUserContextClient || this.ocUserContextClient.token !== token) {
      const { graph, ocs } = client(serverUrl, createAxiosInstance({ accessToken: token }))
      this.ocUserContextClient = {
        token,
        graph,
        ocs
      }
    }
  }

  public ocsPublicLinkContext(serverUrl: string, token: string, password?: string): OCS {
    this.initOcPublicLinkContextClient(serverUrl, token, password)
    return this.ocPublicLinkContextClient.ocs
  }

  private initOcPublicLinkContextClient(serverUrl: string, token: string, password?: string) {
    if (!this.ocPublicLinkContextClient || this.ocPublicLinkContextClient.token !== token) {
      const { graph, ocs } = client(
        serverUrl,
        createAxiosInstance({
          publicLinkToken: token,
          publicLinkPassword: password
        })
      )
      this.ocPublicLinkContextClient = {
        token,
        graph,
        ocs
      }
    }
  }

  public get httpUnAuthenticated(): HttpClient {
    if (!this.httpUnAuthenticatedClient) {
      this.httpUnAuthenticatedClient = new HttpClient({
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
    }

    return this.httpUnAuthenticatedClient
  }

  public get owncloudSdk(): OwnCloudSdk {
    return this.owncloudSdkClient
  }

  public set owncloudSdk(owncloudSdk: OwnCloudSdk) {
    this.owncloudSdkClient = owncloudSdk
  }
}

export const clientService = new ClientService()
