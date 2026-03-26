// < definition unresolvable-imports src/`main.js`/

import Application from '@ember/application'
//     ^^^^^^^^^^^ reference external @ember/application Application.
import Resolver from 'ember-resolver'
//     ^^^^^^^^ reference external ember-resolver Resolver.
import config from 'ghost-admin/config/environment'
//     ^^^^^^ reference external ghost-admin/config/environment config.

export function setup() {
//              ^^^^^ definition unresolvable-imports src/`main.js`/setup().
    return new Application(Resolver, config)
//             ^^^^^^^^^^^ reference @ember/application Application.
//                         ^^^^^^^^ reference ember-resolver Resolver.
//                                   ^^^^^^ reference ghost-admin/config/environment config.
}

