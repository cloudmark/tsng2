export class StringUtils {
    static startsWith(original, searchString) {
        return original.indexOf(searchString, 0) === 0;
    };

    static startsWithEither(original, ...searchString: string[]) {
        return searchString.filter(searchChar => original.indexOf(searchChar, 0) === 0).length > 0;
    };

    static containsEither(original, ...searchString: string[]) {
        return searchString.filter(searchChar => original.indexOf(searchChar, 0) !== -1).length > 0;
    };
}
