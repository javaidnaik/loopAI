# Publish checklist

One-time:

```
npm login
npm view @javaidnaik/loopai version    # if this returns a version, the name is taken
```

If `@javaidnaik/loopai` is taken, scope it. In package.json set the name to
`@javaidnaik/loopai`, then publish with public access (scoped packages are
private by default):

```
npm publish --access public
```

Release flow (each version):

```
# 1. make changes, update CHANGELOG.md under a new version heading
# 2. bump the version (patch | minor | major) - this also git-tags it
npm version patch

# 3. publish
npm publish            # add --access public the first time if scoped

# 4. push the commit and tag
git push && git push --tags
```

Verify it works for users:

```
npm install -g @javaidnaik/loopai && loopai install --tool all
```

Notes:
- `files` in package.json already limits the published tarball to `bin/` and
  `prompts/`. Run `npm pack` first to preview exactly what ships.
- Test locally before publishing: `node bin/loopai.js install --tool all`.
