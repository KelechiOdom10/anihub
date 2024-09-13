import { Cross1Icon } from "@radix-ui/react-icons";
import { type FunctionComponent } from "react";

import { Button } from "./button";

export interface FilterTag {
  key: string;
  value: string;
  label: string;
}

interface FilterTagsProps {
  tags: FilterTag[];
  onRemove: (key: string, value: string) => void;
  onClearAll: () => void;
}

const FilterTags: FunctionComponent<FilterTagsProps> = ({
  tags,
  onRemove,
  onClearAll,
}) => {
  if (tags.length === 0) return null;

  return (
    <div className="mt-4 flex w-full flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <Button
          variant="secondary"
          key={tag.key}
          size="sm"
          onClick={() => onRemove(tag.key, tag.value)}
          className="text-[13px] capitalize"
        >
          {tag.label}
          <Cross1Icon className="ml-2 size-3.5" />
        </Button>
      ))}
      {tags.length > 1 && (
        <Button size="sm" onClick={onClearAll} className="text-[13px]">
          Clear All
          <Cross1Icon className="ml-2 size-3.5" />
        </Button>
      )}
    </div>
  );
};

export default FilterTags;
