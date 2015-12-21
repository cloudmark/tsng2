import {RouteDefinition} from './routes'

export interface ModuleDefinition {
    moduleName: string
    className: string
    interfaces: Array<string>
    annotations:  { [annotation: string]: any; }
}