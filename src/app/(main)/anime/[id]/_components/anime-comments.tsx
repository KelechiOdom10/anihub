"use client";

import { useQuery } from "@urql/next";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CommentFormModal } from "./comment-form-modal";

import { useAuth } from "~/components/providers/auth-provider";
import { Button } from "~/components/ui/button";
import { CommentCard } from "~/components/ui/comment-card";
import { AnimeCommentsQuery } from "~/graphql/queries";

interface AnimeCommentsProps {
  animeId: number;
}

export const AnimeComments = ({ animeId }: AnimeCommentsProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  console.log({ pathname });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [{ data: commentsData, fetching }, refetchComments] = useQuery({
    query: AnimeCommentsQuery,
    variables: { id: animeId },
    requestPolicy: "cache-first",
  });

  const handleOpenModal = () => {
    if (!user) {
      toast.error("Authentication Required", {
        description: "Please log in to comment on anime.",
      });
      router.push(
        `/login?redirect=${encodeURIComponent(`${pathname}?tab=reviews`)}`
      );
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <Button onClick={handleOpenModal} size="lg">
        {user ? "Write a Review" : "Login to Get Started"}
      </Button>

      <CommentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        animeId={animeId}
        onSuccess={refetchComments}
      />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        {fetching ? (
          <div>Loading comments...</div>
        ) : commentsData?.animeComments?.length ? (
          <div className="space-y-4">
            {commentsData.animeComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </div>
  );
};
