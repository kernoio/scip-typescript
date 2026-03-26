// < definition unresolvable-imports src/`app.ts`/

import Application from '@ember/application'
//     ^^^^^^^^^^^ reference external @ember/application Application.
import Resolver from 'ember-resolver'
//     ^^^^^^^^ reference external ember-resolver Resolver.
import config from 'ghost-admin/config/environment'
//     ^^^^^^ reference external ghost-admin/config/environment config.

export function setup(): unknown {
//              ^^^^^ definition unresolvable-imports src/`app.ts`/setup().
    return { Application, Resolver, config }
//           ^^^^^^^^^^^ definition unresolvable-imports src/`app.ts`/Application0:
//           ^^^^^^^^^^^ reference @ember/application Application.
//                        ^^^^^^^^ definition unresolvable-imports src/`app.ts`/Resolver0:
//                        ^^^^^^^^ reference ember-resolver Resolver.
//                                  ^^^^^^ definition unresolvable-imports src/`app.ts`/config0:
//                                  ^^^^^^ reference ghost-admin/config/environment config.
}

