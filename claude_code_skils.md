# Agent Skills

> Create, manage, and share Skills to extend Claude's capabilities in Claude Code.

Skills are modular capabilities that extend Claude's functionality through organized folders containing instructions, scripts, and resources.

## What are Agent Skills?

Agent Skills package expertise into discoverable capabilities. Each Skill consists of a `SKILL.md` file with instructions that Claude reads when relevant, plus optional supporting files like scripts and templates.

**How Skills are invoked**: Skills are **model-invoked**—Claude autonomously decides when to use them based on your request and the Skill's description. This is different from slash commands, which are **user-invoked** (you explicitly type `/command` to trigger them).

## Skill Locations

| Type | Path | Scope |
|------|------|-------|
| Personal | `~/.claude/skills/` | All your projects |
| Project | `.claude/skills/` | Shared via git |
| Plugin | Bundled with installed plugins | Plugin-scoped |

## Write SKILL.md

Create a `SKILL.md` file with YAML frontmatter and Markdown content:

```yaml
---
name: your-skill-name
description: Brief description of what this Skill does and when to use it
---

# Your Skill Name

## Instructions
Provide clear, step-by-step guidance for Claude.

## Examples
Show concrete examples of using this Skill.
```

**Field requirements**:
- `name`: Lowercase letters, numbers, and hyphens only (max 64 characters)
- `description`: What the Skill does and when to use it (max 1024 characters)

The `description` field is critical for Claude to discover when to use your Skill.

See the [best practices guide](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) for complete authoring guidance.

## Supporting Files

```
my-skill/
├── SKILL.md (required)
├── reference.md (optional documentation)
├── examples.md (optional examples)
├── scripts/
│   └── helper.py (optional utility)
└── templates/
    └── template.txt (optional template)
```

Reference these files from SKILL.md:

```markdown
For advanced usage, see [reference.md](reference.md).

Run the helper script:
\`\`\`bash
python scripts/helper.py input.txt
\`\`\`
```

Claude reads supporting files only when needed (progressive disclosure).

## Restrict Tool Access

Use the `allowed-tools` frontmatter field to limit which tools Claude can use when a Skill is active:

```yaml
---
name: safe-file-reader
description: Read files without making changes. Use when you need read-only file access.
allowed-tools: Read, Grep, Glob
---
```

When `allowed-tools` is specified, Claude can only use those tools without needing permission. If omitted, the standard permission model applies.

## Debug a Skill

If Claude doesn't use your Skill:

1. **Make description specific** — include both what the Skill does and when to use it
2. **Verify file path** — ensure `SKILL.md` exists at the correct location
3. **Check YAML syntax** — opening `---` on line 1, closing `---` before content, no tabs
4. **Run debug mode** — `claude --debug` to see Skill loading errors

## Best Practices

- **Keep Skills focused** — one Skill per capability
- **Write clear descriptions** — include specific trigger terms
- **Use progressive disclosure** — put details in supporting files, not SKILL.md
- **Test activation** — ask questions matching your description to verify discovery

## Examples

### Simple Skill

```yaml
---
name: generating-commit-messages
description: Generates clear commit messages from git diffs. Use when writing commit messages or reviewing staged changes.
---

# Generating Commit Messages

## Instructions

1. Run `git diff --staged` to see changes
2. Suggest a commit message with:
   - Summary under 50 characters
   - Detailed description
   - Affected components

## Best practices
- Use present tense
- Explain what and why, not how
```

### Skill with Tool Permissions

```yaml
---
name: code-reviewer
description: Review code for best practices and potential issues. Use when reviewing code, checking PRs, or analyzing code quality.
allowed-tools: Read, Grep, Glob
---

# Code Reviewer

## Review checklist
1. Code organization and structure
2. Error handling
3. Performance considerations
4. Security concerns
5. Test coverage

## Instructions
1. Read the target files using Read tool
2. Search for patterns using Grep
3. Find related files using Glob
4. Provide detailed feedback on code quality
```

### Multi-file Skill

```
pdf-processing/
├── SKILL.md
├── FORMS.md
├── REFERENCE.md
└── scripts/
    ├── fill_form.py
    └── validate.py
```

```yaml
---
name: pdf-processing
description: Extract text, fill forms, merge PDFs. Use when working with PDF files, forms, or document extraction.
---

# PDF Processing

## Quick start

Extract text:
\`\`\`python
import pdfplumber
with pdfplumber.open("doc.pdf") as pdf:
    text = pdf.pages[0].extract_text()
\`\`\`

For form filling, see [FORMS.md](FORMS.md).
For detailed API reference, see [REFERENCE.md](REFERENCE.md).
```

> List required packages in the description. Packages must be installed in your environment before Claude can use them.

---

**Links**:
- [Agent Skills overview](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [Authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Skills in the Agent SDK](https://docs.claude.com/en/docs/agent-sdk/skills)
- [Quickstart](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/quickstart)
- [Plugins](https://docs.claude.com/en/docs/plugins)
- [Blog: Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
