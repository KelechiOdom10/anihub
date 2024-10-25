import { GitHubLogoIcon, LinkedInLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";

import { Logo } from "../logo";
import { Button } from "../ui/button";

const socials = [
  {
    name: "GitHub",
    url: "https://github.com/KelechiOdom10/anihub",
    icon: GitHubLogoIcon,
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/kelechi-odom/",
    icon: LinkedInLogoIcon,
  },
] as const;

export const Footer = () => {
  return (
    <footer className="border-t border-t-zinc-700/80 px-4 py-6">
      <div className="container flex items-center justify-between p-0">
        <Link aria-label="Home page" href="/">
          <Logo aria-label="Logo" className="h-9 w-auto fill-white" />
        </Link>
        <div className="flex gap-2">
          {socials.map(({ name, url, icon: Icon }) => (
            <Button
              aria-label={name}
              key={name}
              variant="ghost"
              size="icon"
              asChild
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Icon className="h-6 w-6" />
              </a>
            </Button>
          ))}
        </div>
      </div>
    </footer>
  );
};
