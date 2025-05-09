import Link from "next/link";

import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

const tabs = ["overview", "relations", "characters", "reviews"];

export const AnimeTabsNavigation = ({ currentTab }: { currentTab: string }) => {
  return (
    <Tabs value={currentTab} className="relative mb-6">
      <TabsList className="flex max-w-xl justify-start overflow-x-auto whitespace-nowrap">
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} asChild>
            <Link
              href={`?tab=${tab}`}
              className="flex-1 capitalize"
              scroll={false}
              aria-current={currentTab === tab ? "page" : undefined}
              aria-label={`Go to ${tab} tab`}
              prefetch
            >
              {tab}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
