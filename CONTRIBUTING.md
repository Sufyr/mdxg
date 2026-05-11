# Contributing to MDXG

Thanks for your interest in MDXG. This project is in its early stages and input is appreciated, whether that's feedback on the spec, bug reports, new implementation ideas, or code contributions.

## Ways to Contribute

### Feedback on the Spec

The [SPEC.md](SPEC.md) is a living document. If something is unclear, under-specified, or wrong, open an issue. Discussions about the spec are just as valuable as code.

### Bug Reports

If you find a bug in the parser, VS Code extension, or web app, open an issue with:

- What you expected to happen
- What actually happened
- A minimal markdown file that reproduces the problem

### New Implementations

MDXG is designed to be implemented on any platform. To add a new reference implementation:

1. Create a new directory under `packages/`
2. Use [`@mdxg/parser`](packages/parser) for document splitting and heading extraction, or port its logic to your target language
3. Implement the spec against your target platform
4. Add your package to the Reference Implementations table in [README.md](README.md)
5. Open a PR

### Code Contributions

For changes to existing packages:

1. Fork the repository
2. Create a branch from `main`
3. Make your changes
4. Run tests: `pnpm test`
5. Open a PR with a clear description of what changed and why

## Project Structure

```
packages/parser   → @mdxg/parser, shared markdown parser (the foundation)
packages/vscode   → @mdxg/vscode, VS Code extension
apps/web          → @mdxg/web, documentation site (mdxg.dev)
```

The parser is the core library. Both the VS Code extension and web app wrap it with platform-specific code renderers (highlight.js and Shiki, respectively).

## Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the web app in dev mode
pnpm dev

# Run parser tests
pnpm test
```

## Conventions

- The spec uses RFC 2119 keywords (MUST, SHOULD, MAY). Use them precisely.
- Keep the parser framework-agnostic. No DOM APIs, no Node-specific imports beyond what's already there.
- The VS Code extension and web app are reference implementations. They should conform to the spec, not the other way around. If the implementation diverges from the spec, the spec wins (or the spec needs updating).

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](LICENSE).
