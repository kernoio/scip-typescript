import Application from '@ember/application'
import Resolver from 'ember-resolver'
import config from 'ghost-admin/config/environment'

export function setup() {
    return new Application(Resolver, config)
}
