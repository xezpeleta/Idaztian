import { Extension } from '@codemirror/state';
import { IdaztianExtensionConfig } from '../config';
import { headingsExtension } from './live-preview/headings';
import { emphasisExtension } from './live-preview/emphasis';
import { linksExtension } from './live-preview/links';
import { listsExtension } from './live-preview/lists';
import { codeExtension } from './live-preview/code';
import { blockquotesExtension } from './live-preview/blockquotes';
import { horizontalRulesExtension } from './live-preview/horizontal-rules';

/**
 * Assembles all live-preview extensions based on the config.
 */
export function buildExtensions(_config: IdaztianExtensionConfig): Extension[] {
    const extensions: Extension[] = [
        headingsExtension(),
        emphasisExtension(),
        linksExtension(),
        listsExtension(),
        codeExtension(),
        blockquotesExtension(),
        horizontalRulesExtension(),
    ];

    return extensions;
}
