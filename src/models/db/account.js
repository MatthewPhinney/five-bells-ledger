'use strict'

const bcrypt = require('bcrypt')
const Model = require('five-bells-shared').Model
const PersistentModelMixin = require('five-bells-shared').PersistentKnexModelMixin
const uri = require('../../services/uriManager')
const validator = require('../../services/validator')
const Entry = require('./entry').Entry

const knex = require('../../lib/knex').knex

function hashPassword (password) {
  // cache hashes of passwords used in tests to speed up tests 4X
  const cachedHashes = {
    admin: '$2a$10$FhvkZTSER6jgntWw0uBbzue13w2BAPOxfmpDUt9515NmQv7Ixtxsm',
    alice: '$2a$10$g07kBlVI1ltBq/RaQ8i.ruKFmj3TLgOQ0SPgQA1/3O.MX905cyi5C',
    bob: '$2a$10$.ofu.TkYeq/cdQHLBxJd8eCdOhaxOD2rzoHSxP.IgxnNBzzokSuBe',
    candice: '$2a$10$TgdAHqf.EKNzV/R4Ncwpf..NsxuURFIImwhx5pHfyYrKk81.Cz1f.',
    dave: '$2a$10$REGCWsK8iHW.44fifW7cBe/p6kulK9RsxhItIYwz.ak2Sa0Mzdpj2',
    disabled: '$2a$10$RgD4XEwDa/iHy.gosKDhounlFCzKMZRjOTPIsXNYpNant8DJaIFNm'
  }
  if (password in cachedHashes) {
    return cachedHashes[password]
  }
  const rounds = 10
  const salt = bcrypt.genSaltSync(rounds)
  return bcrypt.hashSync(password, salt)
}

class Account extends Model {
  static convertFromExternal (data) {
    if (data.primary) {
      delete data.primary
    }

    // ID is optional on the incoming side
    if (data.id) {
      data.name = uri.parse(data.id, 'account').name.toLowerCase()
      delete data.id
    }

    data.balance = Number(data.balance)
    data.password_hash = data.password ? hashPassword(data.password) : null
    delete data.password

    return data
  }

  static convertToExternal (data) {
    data.id = uri.make('account', data.name.toLowerCase())
    data.balance = String(data.balance)
    delete data.primary
    delete data.password_hash
    delete data.public_key
    delete data.fingerprint
    if (!data.connector) delete data.connector
    if (!data.is_admin) delete data.is_admin
    return data
  }

  getDataConnector () {
    return {
      id: uri.make('account', this.name.toLowerCase()),
      name: this.name,
      connector: this.connector
    }
  }

  static convertFromPersistent (data) {
    data.is_disabled = Boolean(data.is_disabled)
    data.is_admin = Boolean(data.is_admin)
    delete data.created_at
    delete data.updated_at
    return data
  }

  static convertToPersistent (data) {
    data.balance = Number(data.balance)
    data.is_disabled = Number(data.is_disabled || 0)
    data.is_admin = Number(data.is_admin || 0)
    return data
  }

  static findByName (name, options) {
    return Account.findByKey('name', name, options)
  }

  static findByFingerprint (fingerprint, options) {
    return Account.findOne({
      where: {fingerprint: fingerprint},
      transaction: options && options.transaction
    })
  }

  createEntry (values, options) {
    values.account = this.primary
    values.balance = this.balance
    return Entry.create(values, options)
  }

  getDataPublic () {
    const data = this.getDataExternal()
    return { id: data.id, name: data.name }
  }
}

Account.validateExternal = validator.create('Account')

Account.tableName = 'accounts'
PersistentModelMixin(Account, knex)

exports.Account = Account
