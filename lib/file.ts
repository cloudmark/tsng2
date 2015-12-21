import {StringUtils} from './utils/string';
import {ConsoleUtils} from '../lib/utils/console';

// Node module.
var path = require('path');
var fs = require('fs');

export enum ChangeState {
    INSERT,
    DELETE
}

interface Change {
    type:string;
}

export class AddStatement implements Change {
    public type:string = 'add';
    public start: number;
    public text: string;
    constructor(start: number, text: string){
        this.start = start;
        this.text = text;
    }
}

export class RemoveStatement implements Change {
    public type:string = 'remove';
    public start: number;
    public end: number;
    constructor(start: number, end: number){
        this.start= start;
        this.end = end;
    }
}

export class SourceFile {
    basePath: string;
    filename: string;
    targetFilename: string;
    targetPath: string;
    line:number;
    pos:number;
    rawContent: string;
    modChanges: Array<Change> = [];

    constructor(filename: string, rawContent: string) {
        this.filename = filename;
        this.basePath = path.dirname(filename);
        this.targetFilename = path.basename(filename, '.ts') + '.ng.ts';
        this.line = 0;
        this.pos = 0;
        this.rawContent  = rawContent;
    }

    addChange(change: Change){
        this.modChanges.push(change);
    }

    targetFilePath = ():string => this.basePath + '/' + this.targetFilename;


    emit(): string {
        var modification = this.rawContent;
        var delta = 0;
        this.modChanges.forEach((change) => {
            if (change.type === 'remove'){
                var removeStatement:RemoveStatement = <RemoveStatement>change;
                var start = removeStatement.start + delta;
                var end = removeStatement.end + delta;
                modification = modification.substring(0, start) + modification.substring(end);
                delta -= (removeStatement.end - removeStatement.start);
            } else {
                var addStatement:AddStatement = <AddStatement>change;
                var start = addStatement.start + delta;
                var length = addStatement.text.length;
                modification = modification.substring(0, start) + addStatement.text + modification.substring(start);
                delta += length;
            }
        });
        return modification;
    }

    emitAndSave(): void {
        let content = this.emit();
        fs.writeFileSync(this.targetFilePath(), content, 'utf8');
    }



}