import { useState } from 'react'
import { localFn } from './local-module'

export const state = useState(localFn())
