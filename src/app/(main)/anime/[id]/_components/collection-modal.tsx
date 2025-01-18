import { PlusIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useQuery, useMutation } from "@urql/next";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
  AddAnimeToNewCollectionMutation,
  type AddAnimeToNewCollectionInput,
  BulkUpdateCollectionsMutation,
} from "~/graphql/mutations";
import { GetMyCollectionsQuery } from "~/graphql/queries/get-user-collections";

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeId: number;
  animeImage?: string;
}

export function CollectionModal({
  isOpen,
  onClose,
  animeId,
  animeImage,
}: CollectionModalProps) {
  const [{ data: collectionsData }, refetchCollections] = useQuery({
    query: GetMyCollectionsQuery,
    variables: {
      query: {
        limit: 20,
        offset: 0,
      },
      animeId,
    },
    requestPolicy: "cache-and-network",
  });

  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<number, boolean>>(
    new Map()
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // New collection form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [, addAnimeToNewCollection] = useMutation(
    AddAnimeToNewCollectionMutation
  );
  const [, bulkUpdateCollections] = useMutation(BulkUpdateCollectionsMutation);

  const handleClose = () => {
    setShowNewCollectionForm(false);
    setName("");
    setDescription("");
    setIsPublic(true);
    setPendingChanges(new Map());
    onClose();
  };

  const handleCancelChanges = () => {
    setPendingChanges(new Map());
    toast.success("Changes cancelled");
  };

  const handleToggleCollection = (
    collectionId: number,
    currentState: boolean
  ) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      if (prev.has(collectionId)) {
        // If we already have a pending change, remove it
        next.delete(collectionId);
      } else {
        // Otherwise, add a pending change to toggle the current state
        next.set(collectionId, !currentState);
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;
    setIsUpdating(true);

    try {
      const updates = Array.from(pendingChanges.entries()).map(
        ([collectionId, hasAnime]) => ({
          collectionId,
          hasAnime,
        })
      );

      const result = await bulkUpdateCollections({
        input: {
          animeId,
          animeImage,
          updates,
        },
      });

      if (result.error) {
        toast.error("Failed to update collections", {
          description: result.error.message,
        });
        return;
      }

      toast.success(
        `Updated ${pendingChanges.size} collection${
          pendingChanges.size === 1 ? "" : "s"
        }`
      );
      setPendingChanges(new Map());
      refetchCollections();
    } catch (error) {
      console.error("Error updating collections:", error);
      toast.error("Failed to update collections");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateNewCollection = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await addAnimeToNewCollection({
        input: {
          name,
          description,
          isPublic,
          animeId,
          animeImage,
        } satisfies AddAnimeToNewCollectionInput,
      });

      if (result.error) {
        toast.error("Failed to create collection", {
          description: result.error.message,
        });
        return;
      }

      toast.success("Collection created and anime added!");
      refetchCollections();
      handleClose();
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create collection");
    }
  };

  const hasCollections = (collectionsData?.getMyCollections?.length ?? 0) > 0;
  const hasChanges = pendingChanges.size > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogDescription>
            {hasCollections
              ? "Select the collections you want this anime to be in."
              : "Create your first collection to start organizing your favorite anime!"}
          </DialogDescription>
        </DialogHeader>

        {!showNewCollectionForm ? (
          <div className="grid gap-4 py-4">
            {hasCollections ? (
              <>
                <div className="grid gap-4">
                  <Button
                    type="button"
                    fullWidth
                    size="default"
                    onClick={() => setShowNewCollectionForm(true)}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create New Collection
                  </Button>
                  <div className="relative">
                    <div className="max-h-[400px] space-y-2 overflow-y-auto pb-4 pr-2">
                      {collectionsData?.getMyCollections?.map((collection) => {
                        const currentState = Boolean(collection.hasAnime);
                        const pendingState = pendingChanges.get(
                          Number(collection.id)
                        );
                        const effectiveState = pendingState ?? currentState;

                        return (
                          <div
                            key={collection.id}
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleCollection(
                                Number(collection.id),
                                currentState
                              );
                            }}
                            className="group relative flex cursor-pointer items-center gap-x-4 rounded-lg border border-border bg-background p-1.5 hover:bg-accent/50"
                          >
                            <Checkbox
                              id={`collection-${collection.id}`}
                              checked={effectiveState}
                              disabled={isUpdating}
                              className="pointer-events-none absolute right-4 top-1/3"
                            />
                            {collection.thumbnail ? (
                              <Image
                                width={72}
                                height={72}
                                src={collection.thumbnail}
                                alt={collection.name ?? "Collection Thumbnail"}
                                className="h-16 w-16 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-md bg-muted" />
                            )}
                            <div className="flex flex-col">
                              <Label
                                htmlFor={`collection-${collection.id}`}
                                className={`break-words text-base font-medium ${
                                  pendingState !== undefined
                                    ? "text-blue-500 dark:text-blue-400"
                                    : ""
                                } ${isUpdating ? "text-muted-foreground" : ""}`}
                              >
                                {collection.name}
                                {pendingState !== undefined && (
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    (will{" "}
                                    {pendingState ? "add to" : "remove from"}{" "}
                                    collection)
                                  </span>
                                )}
                              </Label>
                              <span className="mt-1 text-sm text-muted-foreground">
                                {collection.totalItems}{" "}
                                {collection.totalItems === 1
                                  ? "title"
                                  : "titles"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-foreground/5 to-transparent" />
                  </div>
                </div>
                {hasChanges && (
                  <div className="mt-4 flex w-full flex-row items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelChanges}
                      size="default"
                      disabled={isUpdating}
                    >
                      <Cross2Icon className="mr-2 h-4 w-4" />
                      Cancel Changes
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isUpdating}
                      fullWidth
                      size="default"
                    >
                      Save Changes ({pendingChanges.size})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="text-center text-muted-foreground">
                  You don't have any collections yet.
                </div>
                <Button
                  type="button"
                  onClick={() => setShowNewCollectionForm(true)}
                  className="w-full"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Your First Collection
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateNewCollection}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Favorite Anime"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A collection of my favorite anime series..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="public">Make this collection public</Label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewCollectionForm(false)}
              >
                Back
              </Button>
              <Button type="submit">Create & Add</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
