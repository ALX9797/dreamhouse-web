# dreamhouse-files

Private, password-gated file sharing for Dreamhouse (tracks + artwork for
labels, press, collaborators). Deployed separately from the main
dreamhouse-web site — this app lives at `files.alxsongs.com`.

Files stay in a private Dropbox folder and are streamed through this app's
own server, so no Dropbox link or password check ever touches the browser
directly. See `.env.example` for the environment variables this needs once
Dropbox and the metadata store are set up.

Not ready for real files yet — this is the initial scaffold, confirming the
app deploys on Vercel before wiring up Dropbox, passwords, or the admin page.
