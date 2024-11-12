"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef } from "react";

import { SearchIcon } from "~/components/icons";
import { Input } from "~/components/ui/input";

export const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = searchParams.get("q") ?? "";
    }
  }, [searchParams]);

  const handleSearch = () => {
    const search = inputRef.current?.value;
    if (search) {
      const params = new URLSearchParams(searchParams);
      params.set("q", search);
      router.push(`/catalog?${params.toString()}`);
    }
  };

  return (
    <Input
      ref={inputRef}
      parentclassname="hidden h-10 flex-1 lg:block"
      placeholder="Search"
      startIcon={
        <SearchIcon className="ml-1 mt-0.5 h-5 w-5 text-muted-foreground" />
      }
      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
    />
  );
};
