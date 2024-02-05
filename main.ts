var path = require('path');

// @ts-ignore

import DEFAULT from "./consts"

import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
    variants: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    variants: DEFAULT.variants
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	 async loadSettings() {
        this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {

        console.log("Loading Snippets-plugin");
        await this.loadSettings();
		
        //this.addSettingTab(new RunSnippetsSettingsTab(this.app, this));

        this.addCommand({
            id: "snippets-plugin",
            name: "Run",
            callback: () => this.runSnippet(),
            hotkeys: [
                {
                    modifiers: ["Mod", "Shift"],
                    key: "Enter",
                },
            ],
        });

        
    }

	onunload() {

	}



/// HEre is where I began copy pasting things:



extract(src, lineNumber, variants = DEFAULT.variants) {

    function is(line, target) {
        let str = line.trim()
        return str.toUpperCase() === target.toUpperCase();
    }

    let lines = src.split('\n')
    let begin = null
    let end = null
    let lang = null

    function fenceOpeningWithKey(line) {
        for (var key of Object.keys(variants)) {
            if (is(line, '```' + key)) {
                return key
            }
        }
        return null
    }


    for (let i = lineNumber; i >= 0; i--) {

        let key = fenceOpeningWithKey(lines[i])
        if (key) {
            begin = i;
            lang = key
            break
        } else if (i !== lineNumber && is(lines[i], '```')) {
            begin = null
            lang = null
            break
        }
    }

    for (let i = lineNumber; i < lines.length; i++) {
        if (i !== begin && is(lines[i], '```')) {
            end = i;
            break
        }
    }

    if ((begin != null) && (end != null)) {
        return {
            lang: lang,
            text: lines.slice(begin + 1, end).join('\n'),
            begin: begin,
            end: end,
        };
    }
    return null

}

runSnippet() {
        let vars = this.get_vars();

        if (!vars) return;
        
        let variants = this.settings.variants

        const view = this.app.workspace.activeLeaf.view;
        if (view instanceof MarkdownView) {

            const editor = view.sourceMode.cmEditor;

            let document = editor.getDoc().getValue()
            let line = editor.getCursor().line

            let match = extract(document, line, variants)

            if (match !== null) {
                let targetLine = match.end + 1
                let lang = match.lang
                // @ts-ignore
                let variant = variants[lang]
                let command = apply_template(match.text, variant.template, vars)

                const {exec} = require("child_process");
                exec(
                  command,
                  variant.options ? variant.options  : {}, 
                  (error, stdout, stderr) => {
                    if (error) {
                      console.error(`error: ${error.message}`);
                      if (variant.appendOutputContents) {
                        writeResult(editor, error, targetLine);
                      }
                      if (variant.showModal) {
                        new Notice(error.message);
                      }
                      return;
                    }
                    if (stderr) {
                      console.error(`stderr: ${stderr}`);
                      if (variant.appendOutputContents) {
                        writeResult(editor, stderr, targetLine);
                      }
                      if (variant.showModal) {
                        new Notice(stderr);
                      }
                      return;
                    }
                    console.debug(`stdout: ${stdout}`);
                    if (variant.appendOutputContents) {
                      writeResult(editor, stdout, targetLine);
                    }
                    if (variant.showModal) {
                      new Notice(stdout);
                    }
                  }
                );

            }
        }
    }

 get_vars() {
        let active_view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (active_view == null) {
            return null;
        }

        let vaultPath = this.app.vault.adapter.basePath;
        let folder = active_view.file.parent.path;
        let fileName = active_view.file.name

        return {
            vault_path: vaultPath,
            folder: folder,
            file_name: fileName,
            file_path: path.join(vaultPath, folder, fileName),
            python: 'python3 -c'
        }
    }
	

writeResult(editor, result: string, outputLine: number) {

    if (typeof result === 'string') {
    let output = `\n\`\`\`output
${result ? result.trim() : result}    
\`\`\`
`

        editor.getDoc().replaceRange(output, {line: outputLine, ch: 0});
    }


}



}
