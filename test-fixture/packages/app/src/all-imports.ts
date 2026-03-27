import lodash from 'lodash'
import { add } from 'lodash/add'
import { Component } from '@angular/core'
import type { SomeType } from 'lodash'
import * as allLodash from 'lodash'

import { sibling } from './sibling'
import { Foo } from '@/components/Foo'
import { bar } from '@queries/bar'
import { thing } from '$lib/thing'
import { shared } from '@myworkspace/shared'
import { Foo as BaseUrlFoo } from 'components/Foo'

export { lodash, add, Component, sibling, Foo, bar, thing, shared, BaseUrlFoo, allLodash }
export type { SomeType }
