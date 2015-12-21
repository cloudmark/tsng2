import { ConsoleUtils } from '../utils/console';
var TSAngular;
(function (TSAngular) {
    class Lexer {
        constructor(fileName, content) {
            this.moduleDefinition = {
                moduleName: null,
                routes: Array(),
                injections: Array()
            };
            this.tokens = {
                '@Component': this.extractComponentElements,
                '@RouteConfig': this.extractRouteConfigElements,
                'module': this.extractModuleName,
                'constructor': this.extractConstructor
            };
            ConsoleUtils.log("Processing File: " + fileName);
            this.content = content;
            this.fileName = fileName;
            this._lookahead = 20;
        }
        lex() {
            while (this.current < this.content.length) {
                this.processFileTokens(this.content.substring(this.current, this.current + this._lookahead));
                this.current++;
            }
            return this.moduleDefinition;
        }
        processFileTokens(lookAhead) {
            for (var token in this.tokens) {
                if (lookAhead.toLowerCase().startsWith(token))
                    this.tokens[token]();
            }
        }
        extractModuleName() {
            var buffer = '';
            this.current += 'module'.length;
            while (this.content[this.current] != '}' && this.current < this.content.length) {
                buffer += this.content[this.current];
                this.current++;
            }
            this.moduleDefinition.moduleName = buffer;
            if (buffer) {
                throw Error(`File ${this.fileName} already has a module definition.  You are only allowed a single module per file.  `);
            }
        }
        extractComponentElements() {
        }
        extractRouteConfigElements() {
        }
        emitAngularDefinition() {
        }
        extractConstructor() {
        }
    }
    TSAngular.Lexer = Lexer;
})(TSAngular || (TSAngular = {}));
