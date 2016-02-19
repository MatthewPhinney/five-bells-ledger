'use strict'

const _ = require('lodash')

const Model = require('five-bells-shared').Model
const PersistentModelMixin = require('five-bells-shared').PersistentKnexModelMixin
const validator = require('../../services/validator')
const uri = require('../../services/uriManager')

const knex = require('../../lib/knex').knex
const FINAL_STATES = ['executed', 'failed', 'rejected']

class Transfer extends Model {
  static convertFromExternal (data) {
    // ID is optional on the incoming side
    if (data.id) {
      data.id = uri.parse(data.id, 'transfer').id.toLowerCase()
    }
    for (let debit of data.debits) {
      debit.account = uri.parse(debit.account, 'account').name.toLowerCase()
    }
    for (let credit of data.credits) {
      credit.account = uri.parse(credit.account, 'account').name.toLowerCase()
    }

    if (typeof data.timeline === 'object') {
      data.proposed_at = data.timeline.proposed_at
      data.prepared_at = data.timeline.prepared_at
      data.executed_at = data.timeline.executed_at
      data.rejected_at = data.timeline.rejected_at
      delete data.timeline
    }

    if (typeof data.expires_at === 'string') {
      data.expires_at = new Date(data.expires_at)
    }

    return data
  }

  static convertToExternal (data) {
    data.id = uri.make('transfer', data.id.toLowerCase())

    for (let debit of data.debits) {
      debit.account = uri.make('account', debit.account)
    }
    for (let credit of data.credits) {
      credit.account = uri.make('account', credit.account)
    }

    const timelineProperties = [
      'proposed_at',
      'prepared_at',
      'executed_at',
      'rejected_at'
    ]

    data.timeline = _.pick(data, timelineProperties)
    data = _.omit(data, timelineProperties)
    if (_.isEmpty(data.timeline)) delete data.timeline

    if (data.expires_at instanceof Date) {
      data.expires_at = data.expires_at.toISOString()
    }

    return data
  }

  static convertFromPersistent (data) {
    delete data.created_at
    delete data.updated_at
    if (typeof data.credits === 'string') {
      data.credits = JSON.parse(data.credits)
    }
    if (typeof data.debits === 'string') {
      data.debits = JSON.parse(data.debits)
    }
    if (typeof data.execution_condition === 'string') {
      data.execution_condition = JSON.parse(data.execution_condition)
    }
    if (typeof data.cancellation_condition === 'string') {
      data.cancellation_condition = JSON.parse(data.cancellation_condition)
    }
    if (typeof data.additional_info === 'string') {
      data.additional_info = JSON.parse(data.additional_info)
    }
    if (data.expires_at) {
      data.expires_at = new Date(data.expires_at)
    }
    data = _.omit(data, _.isNull)
    return data
  }

  static convertToPersistent (data) {
    if (typeof data.credits !== 'string') {
      data.credits = JSON.stringify(data.credits)
    }
    if (typeof data.debits !== 'string') {
      data.debits = JSON.stringify(data.debits)
    }
    if (typeof data.execution_condition !== 'string') {
      data.execution_condition = JSON.stringify(data.execution_condition)
    }
    if (typeof data.cancellation_condition !== 'string') {
      data.cancellation_condition = JSON.stringify(data.cancellation_condition)
    }
    if (typeof data.additional_info !== 'string') {
      data.additional_info = JSON.stringify(data.additional_info)
    }
    return data
  }

  isFinalized () {
    return _.includes(FINAL_STATES, this.state)
  }
}

Transfer.validateExternal = validator.create('Transfer')

Transfer.tableName = 'transfers'
PersistentModelMixin(Transfer, knex)

exports.Transfer = Transfer
