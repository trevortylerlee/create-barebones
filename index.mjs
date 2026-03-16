#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import * as p from "@clack/prompts";
import { isCancel } from "@clack/prompts";
import { downloadTemplate } from "giget";
import color from "picocolors";

const CONTACT_LINK_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "github", label: "GitHub" },
  { value: "twitter", label: "X (formerly Twitter)" },
  { value: "bluesky", label: "Bluesky" },
  { value: "threads", label: "Threads" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "custom", label: "Custom" },
];

const CONTACT_URL_PREFIXES = {
  email: "mailto:",
  github: "https://github.com/",
  twitter: "https://x.com/",
  bluesky: "https://bsky.app/profile/",
  threads: "https://threads.net/@",
  instagram: "https://instagram.com/",
  tiktok: "https://tiktok.com/@",
  youtube: "https://youtube.com/@",
};

const LOCALE_OPTIONS = [
  { value: "en-US", label: "en-US (English - United States)" },
  { value: "en-GB", label: "en-GB (English - United Kingdom)" },
  { value: "en-CA", label: "en-CA (English - Canada)" },
  { value: "en-AU", label: "en-AU (English - Australia)" },
  { value: "es-ES", label: "es-ES (Spanish - Spain)" },
  { value: "fr-FR", label: "fr-FR (French - France)" },
  { value: "de-DE", label: "de-DE (German - Germany)" },
  { value: "pt-BR", label: "pt-BR (Portuguese - Brazil)" },
  { value: "ja-JP", label: "ja-JP (Japanese - Japan)" },
  { value: "ko-KR", label: "ko-KR (Korean - Korea)" },
  { value: "zh-CN", label: "zh-CN (Chinese - China)" },
  { value: "custom", label: "Custom locale" },
];

function handleCancel(value) {
  if (isCancel(value)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }
  return value;
}

async function main() {
  console.log();
  p.intro(color.bgCyan(color.black(" create-barebones ")));

  // 1. Project name
  const name = handleCancel(
    await p.text({
      message: "Project name",
      placeholder: "barebones",
      defaultValue: "barebones",
      validate: (value) => {
        const v = value || "barebones";
        if (fs.existsSync(v)) return `Directory "${v}" already exists.`;
      },
    })
  );

  // 2. Site title
  const title = handleCancel(
    await p.text({
      message: "What is your site title?",
      placeholder: "My Blog",
      defaultValue: "My Blog",
    })
  );

  // 3. Site description
  const description = handleCancel(
    await p.text({
      message: "What is your site description?",
      placeholder: "A personal blog built with Barebones.",
      defaultValue: "A personal blog built with Barebones.",
    })
  );

  // 4. Author name
  const author = handleCancel(
    await p.text({
      message: "What is the author's name?",
      placeholder: "Trevor Tyler Lee",
      defaultValue: "Trevor Tyler Lee",
    })
  );

  // 5. Site URL
  const siteUrl = handleCancel(
    await p.text({
      message: "What is your site URL?",
      placeholder: "https://barebones.trevortylerlee.com",
      defaultValue: "https://barebones.trevortylerlee.com",
    })
  );

  // 6. Locale selection
  const localeChoice = handleCancel(
    await p.select({
      message: "What locale do you want to use?",
      options: LOCALE_OPTIONS,
      initialValue: "en-US",
    })
  );

  let locale = localeChoice;
  if (localeChoice === "custom") {
    locale = handleCancel(
      await p.text({
        message: "Enter your custom locale",
        placeholder: "en-US",
        validate: (value) => {
          if (!value) return "Please enter a locale.";
        },
      })
    );
  }

  // 7. Contact links
  const configureLinks = handleCancel(
    await p.confirm({
      message: "Do you want to configure your contact links?",
      initialValue: true,
    })
  );

  const contactLinks = [];
  if (configureLinks) {
    const selectedTypes = handleCancel(
      await p.multiselect({
        message:
          "Which contact links do you want to add?\n" +
          color.dim("  Use Space to select, Enter to submit."),
        options: CONTACT_LINK_OPTIONS,
        required: false,
      })
    );

    for (const type of selectedTypes) {
      if (type === "custom") {
        // Custom links loop
        let addMore = true;
        while (addMore) {
          const customLabel = handleCancel(
            await p.text({
              message: "Custom link name",
              placeholder: "e.g. LinkedIn, Mastodon, Website",
              validate: (value) => {
                if (!value) return "Please enter a name.";
              },
            })
          );
          const customUrl = handleCancel(
            await p.text({
              message: `${customLabel} URL`,
              placeholder: "https://",
              validate: (value) => {
                if (!value) return "Please enter a URL.";
              },
            })
          );
          contactLinks.push({
            key: customLabel.toLowerCase().replace(/\s+/g, ""),
            label: customLabel,
            href: customUrl,
          });
          addMore = handleCancel(
            await p.confirm({
              message: "Add another custom link?",
              initialValue: false,
            })
          );
        }
      } else {
        const prefix = CONTACT_URL_PREFIXES[type] || "https://";
        const label = CONTACT_LINK_OPTIONS.find((o) => o.value === type).label;
        const url = handleCancel(
          await p.text({
            message: `${label} URL`,
            placeholder: `${prefix}`,
            validate: (value) => {
              if (!value) return `Please enter your ${label} URL.`;
            },
          })
        );
        contactLinks.push({ key: type, label, href: url });
      }
    }
  }

  // 8. Keep demo content
  const keepDemoContent = handleCancel(
    await p.confirm({
      message: "Keep the demo posts and projects?",
      initialValue: true,
    })
  );

  // 9. Install dependencies
  const install = handleCancel(
    await p.confirm({
      message: "Install dependencies?",
      initialValue: true,
    })
  );

  const s = p.spinner();

  // Clone template
  s.start("Cloning Barebones template");
  const { dir } = await downloadTemplate("github:trevortylerlee/barebones", {
    dir: name,
    cwd: process.cwd(),
  });
  s.stop("Template cloned.");

  // Update siteConfig.ts
  const siteConfigPath = path.join(dir, "src", "siteConfig.ts");
  let siteConfig = fs.readFileSync(siteConfigPath, "utf-8");

  siteConfig = siteConfig.replace(
    /export const SITE: SiteConfiguration = \{[\s\S]*?\};/,
    `export const SITE: SiteConfiguration = {
  title: "${title}",
  description:
    "${description}",
  href: "${siteUrl}",
  author: "${author}",
  locale: "${locale}",
};`
  );

  // Build SOCIAL_LINKS
  let socialBlock;
  if (contactLinks.length > 0) {
    const entries = contactLinks.map(
      (link) =>
        `  ${link.key}: {\n    label: "${link.label}",\n    href: "${link.href}",\n  }`
    );
    socialBlock = `export const SOCIAL_LINKS: SocialLinks = {\n${entries.join(",\n")},\n};`;
  } else if (!configureLinks) {
    // Keep the default links from the template
    socialBlock = null;
  } else {
    socialBlock = `export const SOCIAL_LINKS: SocialLinks = {};`;
  }

  if (socialBlock) {
    siteConfig = siteConfig.replace(
      /export const SOCIAL_LINKS: SocialLinks = \{[\s\S]*?\};/,
      socialBlock
    );
  }

  fs.writeFileSync(siteConfigPath, siteConfig);

  // Update astro.config.mjs
  const astroConfigPath = path.join(dir, "astro.config.mjs");
  let astroConfig = fs.readFileSync(astroConfigPath, "utf-8");
  astroConfig = astroConfig.replace(/site: ".*"/, `site: "${siteUrl}"`);
  fs.writeFileSync(astroConfigPath, astroConfig);

  // Update package.json
  const pkgPath = path.join(dir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.name = name;
  pkg.version = "0.0.1";
  delete pkg.author;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // Remove demo content
  if (!keepDemoContent) {
    const postsDir = path.join(dir, "src", "content", "posts");
    const projectsDir = path.join(dir, "src", "content", "projects");
    fs.rmSync(postsDir, { recursive: true, force: true });
    fs.rmSync(projectsDir, { recursive: true, force: true });
    fs.mkdirSync(postsDir, { recursive: true });
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  // Install dependencies
  if (install) {
    s.start("Installing dependencies");
    const pkgManager = detectPackageManager();
    execSync(`${pkgManager} install`, { cwd: dir, stdio: "ignore" });
    s.stop("Dependencies installed.");
  }

  const fullPath = path.resolve(dir);

  const nextSteps = [`cd ${name}`];
  if (!install) nextSteps.push("npm install");
  nextSteps.push("npm run dev");

  p.note(nextSteps.join("\n"), "Next steps");

  p.outro(
    color.green(`Success! Created ${name} at ${fullPath}`)
  );
}

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent;
  if (ua) {
    if (ua.startsWith("pnpm")) return "pnpm";
    if (ua.startsWith("yarn")) return "yarn";
    if (ua.startsWith("bun")) return "bun";
  }
  return "npm";
}

main().catch((err) => {
  p.cancel("Something went wrong.");
  console.error(err);
  process.exit(1);
});
