import { zodResolver } from "@hookform/resolvers/zod";
import { StarIcon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMutation } from "urql";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { CreateAnimeCommentMutation } from "~/graphql/mutations";
import { cn } from "~/lib/utils";

const commentFormSchema = z.object({
  rating: z.number().min(1, "Rating is required").max(5),
  text: z.string().min(1, "Comment is required"),
  isSpoiler: z.boolean().default(false),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

interface CommentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeId: number;
  onSuccess: () => void;
}

export function CommentFormModal({
  isOpen,
  onClose,
  animeId,
  onSuccess,
}: CommentFormModalProps) {
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    register,
    formState: { isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      rating: 0,
      text: "",
      isSpoiler: false,
    },
  });

  const [{ fetching: isCreating }, createComment] = useMutation(
    CreateAnimeCommentMutation
  );

  const rating = watch("rating");
  const isSpoiler = watch("isSpoiler");

  const onSubmit = async (values: CommentFormValues) => {
    try {
      const result = await createComment({
        input: {
          animeId,
          text: values.text,
          rating: values.rating,
          isSpoiler: values.isSpoiler,
        },
      });

      if (result.error) {
        toast.error("Failed to post comment", {
          description: result.error.message,
        });
        return;
      }

      toast.success("Comment posted successfully!");
      reset();
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("rating", value)}
                  className={cn(
                    "rounded-md p-1 transition-colors hover:bg-accent",
                    rating >= value
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  )}
                  aria-label={`Rate ${value} stars`}
                >
                  <StarIcon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Your Comment</Label>
            <Textarea
              id="text"
              {...register("text")}
              placeholder="Share your thoughts about this anime..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="spoiler"
              checked={isSpoiler}
              onCheckedChange={(checked) => setValue("isSpoiler", checked)}
            />
            <Label htmlFor="spoiler">This comment contains spoilers</Label>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isCreating}
            className="w-full"
          >
            Post Comment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
