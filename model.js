import { Meteor } from 'meteor/meteor'
import { Random } from 'meteor/random'

/*
    Model specification

    generateAccessToken(client, user, scope) is optional and should return a String.
    generateAuthorizationCode() is optional and should return a String.
    generateRefreshToken(client, user, scope) is optional and should return a String.

    getUser(username, password) should return an object:
        No longer requires that id be returned.
    getUserFromClient(client) should return an object:
        No longer requires that id be returned.
    grantTypeAllowed() was removed. You can instead:
        Return falsy in your getClient()
        Throw an error in your getClient()
    revokeAuthorizationCode(code) is required and should return true
    revokeToken(token) is required and should return true


    validateScope(user, client, scope) should return a Boolean.

 */

let AccessTokens = void 0
let RefreshTokens = void 0
let Clients = void 0
let AuthCodes = void 0
let debug = void 0

const bind = fn => Meteor.bindEnvironment(fn)

function OAuthMeteorModel (config = {}) {
  config.accessTokensCollectionName = config.accessTokensCollectionName || 'oauth_access_tokens'
  config.refreshTokensCollectionName = config.refreshTokensCollectionName || 'oauth_refresh_tokens'
  config.clientsCollectionName = config.clientsCollectionName || 'oauth_clients'
  config.authCodesCollectionName = config.authCodesCollectionName || 'oauth_auth_codes'

  debug = (debug = config.debug)
  AccessTokens = (config.accessTokensCollection || new Meteor.Collection(config.accessTokensCollectionName))
  RefreshTokens = (config.refreshTokensCollection || new Meteor.Collection(config.refreshTokensCollectionName))
  Clients = (config.clientsCollection || new Meteor.Collection(config.clientsCollectionName))
  AuthCodes = (config.authCodesCollection || new Meteor.Collection(config.authCodesCollectionName))
}

/**
 getAccessToken(token) should return an object with:
 accessToken (String)
 accessTokenExpiresAt (Date)
 client (Object), containing at least an id property that matches the supplied client
 scope (optional String)
 user (Object)
 */
OAuthMeteorModel.prototype.getAccessToken = bind(function (bearerToken) {
  return new Promise((resolve, reject) => {
    if (debug === true) {
      console.log('[OAuth2Server]', 'MODEL getAccessToken (bearerToken:', bearerToken, ')')
    }

    try {
      const token = AccessTokens.findOne({ accessToken: bearerToken })
      return resolve(token)
    } catch (e) {
      return reject(e)
    }
  })
})

OAuthMeteorModel.prototype.createClient = bind(function ({ title, homepage, description, privacyLink, redirectUris, grants }) {
  const existingClient = Clients.findOne({ title, homepage })
  if (existingClient) {
    return Clients.update(existingClient._id, { $set: { description, privacyLink, redirectUris, grants } })
  }
  const clientId = Random.id(16)
  const secret = Random.id(32)
  const clientDocId = Clients.insert({
    title,
    homepage,
    description,
    privacyLink,
    redirectUris,
    clientId,
    secret,
    grants
  })
  return Clients.findOne(clientDocId)
})

/**
 getClient(clientId, clientSecret) should return an object with, at minimum:
 redirectUris (Array)
 grants (Array)
 */
OAuthMeteorModel.prototype.getClient = bind(function (clientId) {
  return new Promise((resolve, reject) => {
    if (debug === true) {
      console.log(`[OAuth2Server] MODEL getClient (clientId: ${clientId})`)
    }

    try {
      return resolve(Clients.findOne({ clientId }))
    } catch (e) {
      return reject(e)
    }
  })
})

/**
 saveToken(token, client, user) and should return:
 accessToken (String)
 accessTokenExpiresAt (Date)
 client (Object)
 refreshToken (optional String)
 refreshTokenExpiresAt (optional Date)
 user (Object)
 */
OAuthMeteorModel.prototype.saveToken = bind(function (token, clientId, expires, user) {
  return new Promise((resolve, reject) => {
    if (debug === true) {
      console.log('[OAuth2Server]', 'MODEL saveAccessToken (token:', token, ', clientId:', clientId, ', user:', user, ', expires:', expires, ')')
    }

    try {
      const tokenId = AccessTokens.insert({
        accessToken: token,
        clientId,
        userId: user.id,
        expires
      })

      return resolve(tokenId)
    } catch (e) {
      return reject(e)
    }
  })
})

/**
 getAuthCode() was renamed to getAuthorizationCode(code) and should return:
 client (Object), containing at least an id property that matches the supplied client
 expiresAt (Date)
 redirectUri (optional String)
 user (Object)
 */
OAuthMeteorModel.prototype.getAuthorizationCode = bind(function (authCode) {
  return new Promise((resolve, reject) => {
    if (debug === true) {
      console.log('[OAuth2Server]', 'MODEL getAuthCode (authCode: ' + authCode + ')')
    }

    try {
      const code = AuthCodes.findOne({ authCode })
      return resolve(code)
    } catch (e) {
      return reject(e)
    }
  })
})

/**
 saveAuthorizationCode(code, client, user) and should return:
 authorizationCode (String)
 */
OAuthMeteorModel.prototype.saveAuthorizationCode = bind(function (code, clientId, expires, user) {
  return new Promise((resolve, reject) => {
    if (debug === true) {
      console.log('[OAuth2Server]', 'MODEL saveAuthCode (code:', code, ', clientId:', clientId, ', expires:', expires, ', user:', user, ')')
    }

    try {
      const codeId = AuthCodes.upsert(
        { authCode: code }
        , {
          authCode: code,
          clientId,
          userId: user.id,
          expires
        }
      )

      return resolve(codeId)
    } catch (e) {
      return reject(e)
    }
  })
})

OAuthMeteorModel.prototype.saveRefreshToken = bind(function (token, clientId, expires, user) {
  return new Promise((resolve, reject) => {
    if (debug === true) {
      console.log('[OAuth2Server]', 'MODEL saveRefreshToken (token:', token, ', clientId:', clientId, ', user:', user, ', expires:', expires, ')')
    }

    try {
      const tokenId = RefreshTokens.insert({
        refreshToken: token,
        clientId,
        userId: user.id,
        expires
      })

      return resolve(tokenId)
    } catch (e) {
      return reject(e)
    }
  })
})

/**
 getRefreshToken(token) should return an object with:
 refreshToken (String)
 client (Object), containing at least an id property that matches the supplied client
 refreshTokenExpiresAt (optional Date)
 scope (optional String)
 user (Object)
 */
OAuthMeteorModel.prototype.getRefreshToken = bind(function (refreshToken) {
  return new Promise((resolve, reject) => {
    if (debug === true) {
      console.log('[OAuth2Server]', 'MODEL getRefreshToken (refreshToken: ' + refreshToken + ')')
    }

    try {
      const token = RefreshTokens.findOne({ refreshToken })
      return resolve(token)
    } catch (e) {
      return reject(e)
    }
  })
})

OAuthMeteorModel.prototype.grantTypeAllowed = function (clientId, grantType) {
  return new Promise((resolve) => {
    if (debug === true) {
      console.log('[OAuth2Server]', 'MODEL grantTypeAllowed (clientId:', clientId, ', grantType:', grantType + ')')
    }
    return resolve([ 'authorization_code', 'refresh_token' ].includes(grantType))
  })
}

export const Model = OAuthMeteorModel

export const modelHelpers = {
  getClientDoc ({ active, clientId }) {
    return Clients.findOne({ active, clientId })
  }
}
