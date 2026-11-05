# St Helens Celebrity News

The 2002 St Helens Celebrity News site, rebuilt from Wayback Machine captures as a plain static site.
"The glitzy world of the post-industrial shithole."

- Upload everything (including the `img` folder) to the web root – no database or CMS needed.
- Files should be 644 and folders 755.
- Optional: add `ErrorDocument 404 /404.html` to `.htaccess`.

## Deployment

`.cpanel.yml` tells cPanel's Git Version Control to copy the site into `public_html` and set permissions (files 644, folders 755).
It does not touch `.htaccess` on the server, so existing server rules are kept – add `ErrorDocument 404 /404.html` there by hand.
