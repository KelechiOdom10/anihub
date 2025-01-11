"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMutation } from "urql";
import { z } from "zod";

import { LoadingButton } from "~/components/loading-button";
import { AnimeCard } from "~/components/ui/anime-card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { CreateCollectionMutation } from "~/graphql/mutations";
import { type TopAnimeResult } from "~/graphql/queries";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
  isPublic: z.boolean().default(true),
  items: z
    .array(
      z.object({
        id: z.number(),
        animeImage: z.string(),
      })
    )
    .min(1, "Please select at least one anime"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCollectionProps {
  topAnimes: TopAnimeResult["getTopAnimes"];
}

export function CreateCollection({ topAnimes }: CreateCollectionProps) {
  const [selectedAnime, setSelectedAnime] = useState<Set<number>>(new Set());
  const router = useRouter();
  const [{ fetching }, createCollection] = useMutation(
    CreateCollectionMutation
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: true,
      items: [],
    },
  });

  const handleAnimeSelect = (animeId: number) => {
    setSelectedAnime((prev) => {
      const next = new Set(prev);
      if (next.has(animeId)) {
        next.delete(animeId);
      } else {
        next.add(animeId);
      }
      return next;
    });

    // Update form value for validation
    const selectedAnimeArray = Array.from(selectedAnime).map((id) => {
      const anime = topAnimes?.find((a) => Number(a.id) === id);
      return {
        id,
        animeImage:
          anime?.image?.large ??
          anime?.image?.default ??
          "/fallback-anime.avif",
      };
    });
    form.setValue("items", selectedAnimeArray, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const { data, error } = await createCollection({
        input: values,
      });

      if (error) {
        toast.error("Failed to create collection", {
          description: error.message,
        });
        return;
      }

      const collection = data?.createCollection;
      if (!collection) {
        toast.error("Failed to create collection", {
          description: "Please try again later",
        });
        return;
      }

      toast.success("Collection created successfully!");
      // const user = collection.user;
      // router.push(`/users/${user?.username}/collections/${collection.id}`);
      router.push("/collections");
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create collection", {
        description: "An unexpected error occurred",
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Create New Collection</h1>
        <p className="text-sm text-muted-foreground">
          Create a collection to share your favorite anime with others
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collection Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., My Favorite Romance Anime"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell others what this collection is about..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Make this collection public</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Public collections can be viewed by anyone
                  </p>
                </div>
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <Label>Select Anime</Label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {topAnimes?.map((anime) => {
                if (!anime.id) return null;

                const id = Number(anime.id);

                return (
                  <div key={anime.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => handleAnimeSelect(id)}
                      className="block w-full"
                    >
                      <AnimeCard
                        anime={anime}
                        className="w-full transition-all duration-300"
                        loading="lazy"
                        selected={selectedAnime.has(id)}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            {form.formState.errors.items && (
              <p className="text-sm text-destructive">
                {form.formState.errors.items.message}
              </p>
            )}
          </div>

          <LoadingButton
            type="submit"
            className="w-full"
            loading={form.formState.isSubmitting || fetching}
          >
            Create Collection
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
}
