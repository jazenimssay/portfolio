# Publishing setup

Your site is static files, so "click Publish and it's live" needs two free
services: **GitHub** to store the files, and **Netlify** to serve them and
handle the login.

Once this is done you'll edit at `yoursite.com/admin`, press **Publish**, and
the change is live in about a minute.

---

## 1. Put the site on GitHub

1. Create a free account at github.com if you don't have one.
2. Make a new repository — call it whatever you like, keep it **Public**
   (private works too, Netlify handles both).
3. Upload every file and folder from this project, keeping the structure:

   ```
   index.html
   netlify.toml
   robots.txt
   _headers
   admin/
   assets/
   ```

   The GitHub website has an "upload files" button — you can drag the whole
   folder in. No command line needed.

## 2. Connect Netlify

1. Sign up free at netlify.com, choosing **Sign up with GitHub**.
2. **Add new site → Import an existing project → GitHub**, then pick your repo.
3. Leave the build settings empty — there is nothing to build. Publish
   directory is `.` (already set in `netlify.toml`).
4. Deploy. You'll get a URL like `yourname.netlify.app`.

## 3. Turn on the login

1. In your Netlify site: **Site configuration → Identity → Enable Identity**.
2. Under **Registration**, choose **Invite only** — this is what stops anyone
   else signing up.
3. Under **Services → Git Gateway**, click **Enable Git Gateway**.
4. Go to the **Identity** tab → **Invite users** → enter your email.
5. Open the invite email, set a password.

## 4. Use it

Go to `yoursite.com/admin`, log in, and you'll see **Portfolio → Projects**.

- **Add a project** with the "Add Project" button
- **Drag rows** to reorder them
- **Delete** with the row menu
- **Upload a cover** directly in the editor — it saves into `assets/img/work/`
- Press **Publish** when you're happy

Netlify redeploys automatically. Changes appear in under a minute.

---

## Notes

**Cover images.** Keep them under about 2 MB and landscape. Very large files
make the page slow — around 1200px wide is plenty.

**The old Project Manager** (the `#admin` window inside the site) still works
and is useful for previewing layouts offline, but Decap is the one that
actually publishes. You can delete the in-site one later if you'd rather have
just the one tool.

**Custom domain.** Netlify does this under Domain management, free, including
the HTTPS certificate.

**If the admin page is blank**, it's almost always Git Gateway not being
enabled in step 3.


---

## Writing a case study

Once you're logged in at `/admin`, open **Portfolio → Projects**. Each row is a
project. Expand one and you get:

**The card** — title, section, case number, year, discipline line, cover image
and card size. This is what shows in the drawer.

**The page** — short summary, client, your role, services, and **The write-up**.

The write-up is a rich editor with a toolbar: headings, bold, italic, lists,
quotes, links, and an image button that uploads straight into the page. No
markdown knowledge needed, though it accepts markdown if you'd rather type it.

**Image gallery** — add as many images as you like, each with an optional
caption. They appear in a grid under the write-up.

Press **Publish** and it's live in about a minute.

### Adding a new project

Click **Add Project** at the bottom of the list, fill it in, publish. Drag rows
to change the order they appear in the drawer.

Give each project a **unique case number** — the site uses it to know which
write-up to open.
