import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

const DEFAULT_VARIANTS = {
  r: {
    template: 'Rscript -e "{{src}}"',
    showModal: true,
    appendOutputContents: true,
    showRunButtonInPreview: true,
  }
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

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

        this.registerInterval(
            window.setInterval(this.injectButtons.bind(this), 1000)
        );
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
