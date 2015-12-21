import {RouteDefinition} from '../meta/routes';
import {ModuleDefinition} from '../meta/modules';
import {ConsoleUtils} from '../utils/console';
import {StringUtils} from '../utils/string';
import {SourceFile, AddStatement, RemoveStatement} from '../File';
import * as ts from "typescript";

export class SourceFileMeta {
    // Was this module found on an actual module xxx { or using the annotation @Module
    realModule: boolean = false;
    moduleName: string;
    className: string;
    component: any;
    injectable: any;
    routeConfig: any;
}

export class Lexer {
    private sourceFile:SourceFile;
    private typeScriptSourceFile:ts.SourceFile;
    private sourceFileMeta = new SourceFileMeta();
    private moduleNode: ts.ModuleDeclaration = null;
    private classNode: ts.ClassDeclaration = null;

    constructor(sourceFile:SourceFile) {
        this.sourceFile = sourceFile;
        this.typeScriptSourceFile = ts.createSourceFile(this.sourceFile.filename, this.sourceFile.rawContent, ts.ScriptTarget.ES6, false);
    }

    processSourceFile(source:ts.SourceFile) {
        this.typeScriptSourceFile.statements.forEach((node) => {
            switch(node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    let importStatement = (<ts.ImportDeclaration>node);
                    var moduleSpecifier = <ts.StringLiteral>importStatement.moduleSpecifier;
                    if (StringUtils.containsEither(moduleSpecifier.text.trim(),'angular2', 'angular2-ext')){
                        this.sourceFile.addChange(new RemoveStatement(node.pos, node.end));
                    }
                    break;

                case ts.SyntaxKind.ModuleDeclaration:
                    let moduleDeclaration = (<ts.ModuleDeclaration>node);
                    this.sourceFileMeta.moduleName = moduleDeclaration.name.text;
                    this.sourceFileMeta.realModule = true;
                    if (this.moduleNode) this.report(node, "module is already defined.  You are only allowed one module per file.  ");
                    this.moduleNode = moduleDeclaration;
                    ts.forEachChild(moduleDeclaration.body, (node) => {
                        this.processModuleElements(node);
                    });
                    break;

                case ts.SyntaxKind.ClassDeclaration:
                    this.processModuleElements(node);
                    break;
            }
        });

        // Is there a class or a module declaration?
        if (this.moduleNode || this.classNode) {
            let blockEnd = (this.sourceFileMeta.realModule) ? this.moduleNode.end - 1 : this.classNode.end;
            // Now we have collected all the data create the final node.
            if (this.sourceFileMeta.injectable) {
                if (this.sourceFileMeta.component || this.sourceFileMeta.routeConfig) {
                    console.log("Injectable Component cannot be annotated with @Component or @RouteConfig");
                    throw new Error();
                } else {
                    let moduleName = this.sourceFileMeta.moduleName;
                    let className = this.sourceFileMeta.className;
                    let realModule = this.sourceFileMeta.realModule;
                    if (!moduleName) throw new Error("You have configured a @Injectable but you are missing a @Module annotation");
                    template = this.getServiceTemplate(moduleName, className);
                    this.sourceFile.addChange(new AddStatement(blockEnd, template));
                    // Create Injectable component
                }
            } else if (this.sourceFileMeta.component && this.sourceFileMeta.routeConfig) {
                if (this.sourceFileMeta.routeConfig.length != 1) throw new Error("Route Config contains more than one route!");
                let moduleName = this.sourceFileMeta.moduleName;
                let className = this.sourceFileMeta.className;
                let route = this.sourceFileMeta.routeConfig[0];
                let component = this.sourceFileMeta.component;
                let realModule = this.sourceFileMeta.realModule;

                if (!moduleName) throw new Error("You have configured a @Component and a @RouteConfig but you are missing a @Module annotation");
                var template:string;
                if (component.template && !component.templateUrl) {
                    template = this.getConfigWithTemplate(moduleName, className, route, component, realModule);
                } else if (!component.template && component.templateUrl) {
                    template = this.getConfigWithTemplateUrl(moduleName, className, route, component, realModule);
                } else {
                    throw new Error("Invalid configuration.  You have template and templateUrl set.  ");
                }
                this.sourceFile.addChange(new AddStatement(blockEnd, template));

            } else if (this.sourceFileMeta.component && !this.sourceFileMeta.routeConfig) {
                console.log("Creating a Virtual Component (Directive) ");
            }
        }

    }

    processModuleElements(node:ts.Node) {
        switch(node.kind){
            case ts.SyntaxKind.ClassDeclaration:
                let classDeclaration = (<ts.ClassDeclaration>node);
                this.classNode = classDeclaration;
                this.sourceFileMeta.className = classDeclaration.name.text;

                // Does the class have any decorators?
                classDeclaration.decorators.forEach((d) => {
                    let decoratorExp = <ts.Decorator>d;
                    let callExpression = <ts.CallExpression>decoratorExp.expression;
                    let decoratorName = <ts.StringLiteral>callExpression.expression;
                    let argumentsExpression = callExpression.arguments;

                    let innerAnnotation = this.sourceFile.rawContent.substring(argumentsExpression.pos, argumentsExpression.end);
                    switch (decoratorName.text) {
                        case 'Module':
                            this.sourceFileMeta.moduleName = innerAnnotation.replace(/'/g, "");
                            break;

                        case 'Component':
                            var annoationObj = this.processAnnotation(innerAnnotation);
                            this.sourceFileMeta.component = annoationObj;
                            break;
                        case 'RouteConfig':
                            var annoationObj = this.processAnnotation(innerAnnotation);
                            this.sourceFileMeta.routeConfig= annoationObj;
                            break;
                        case 'Injectable':
                            var annoationObj = this.processAnnotation(innerAnnotation);
                            this.sourceFileMeta.injectable = annoationObj;
                            break;

                        default:
                            this.report(d, `Annotation ${decoratorName} is not recognized.  `);
                    }
                    //console.log(decoratorName.text);
                    this.sourceFile.addChange(new RemoveStatement(d.pos, d.end));
                });
                break;
        }
    }


    processClassElements(node: ts.Node){

    }

    parseComponent(args:Array<ts.Expression>) {

    }

    parseRouteConfig(args:Array<ts.Expression>) {

    }

    parseInjectable(args:Array<ts.Expression>) {

    }

    getConfigWithTemplateUrl(moduleName: string, className: string, route: any, component: any, realModule: boolean):string {
        let fullClassName = realModule ? moduleName + '.' + className : className;
        return `
angular.module("${moduleName}")
    .config(function($stateProvider, $urlRouterProvider){
        $stateProvider.state('${route.as}', {
            url: '${route.path}',
            templateUrl: '${component.templateUrl}',
            controller: '${moduleName}.${route.component}',
            controllerAs: 'vm'
        })
    })
    .controller('${moduleName}.${route.component}', ${fullClassName});
`;
    }

    getConfigWithTemplate(moduleName: string, className: string, route: any, component: any, realModule: boolean):string {
        let fullClassName = realModule ? moduleName + '.' + className : className;
        return `
angular.module("${moduleName}")
    .config(function($stateProvider, $urlRouterProvider){
        $stateProvider.state('${route.as}', {
            url: '${route.path}',
            templateUrl: '${component.templateUrl}',
            controller: '${moduleName}.${route.component}',
            controllerAs: 'vm'
        })
    })
    .controller('${moduleName}.${route.component}', ${fullClassName})
    .run(function($templateCache) {
        $templateCache.put('${route.as}'.html, '${component.template.join('')}');
    });
`;
    }

    getServiceTemplate(moduleName:string, className: string): string {
        return `
angular
    .module('${moduleName}')
    .service('${className}', ${className});
`;
    }

    processAnnotation(content: string): any {
        content = content.replace(/(\w+)[ ]*:/g, `'$1':`);
        content = content.replace(/:[ ]*(\w+)/g, `:'$1'`);
        content = content.replace(/'/g, '"');
        let result = content.match(/`[^`]*`/g);
        if (result){
            result.forEach((match) => {
                let cleanMatch = match.replace(/`/g, "");
                let tArr = cleanMatch.split('\n');
                content = content.replace(match, JSON.stringify(tArr));
            });
        }
        if (content == "") content = "{}";
        return JSON.parse(content);
    }

    report(node:ts.Node, message:string) {
        let { line, character } = this.typeScriptSourceFile.getLineAndCharacterOfPosition(node.getStart());
        console.log(`${this.typeScriptSourceFile.fileName} (${line + 1},${character + 1}): ${message}`);
    }


    lex():ModuleDefinition {
        this.processSourceFile(this.typeScriptSourceFile);
        this.sourceFile.emitAndSave();
        return null;
    }

}