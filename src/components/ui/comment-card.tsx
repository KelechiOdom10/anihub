import { StarIcon } from "@radix-ui/react-icons";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { Card, CardContent, CardHeader } from "./card";

import { type CommentPreview } from "~/graphql/fragments";
import { formatTimeToNow } from "~/lib/utils/date";

interface CommentCardProps {
  comment: CommentPreview;
}

export function CommentCard({ comment }: CommentCardProps) {
  const formattedDate = formatTimeToNow(comment.createdAt);

  return (
    <Card className="max-w-lg overflow-hidden">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={comment.user?.avatar ?? "/anime-male-avatar.avif"}
                alt={comment.user?.username ?? "Anonymous"}
              />
              <AvatarFallback>
                {comment.user?.username ?? "Anonymous"[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {comment.user?.username ?? "Anonymous"}
              </p>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: comment.rating ?? 0 }).map((_, i) => (
              <StarIcon
                key={i}
                className="h-4 w-4 fill-yellow-500 text-yellow-500"
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {comment.isSpoiler ? (
          <div className="relative">
            <div
              className="absolute inset-0 cursor-pointer backdrop-blur-md"
              onClick={(e) => e.currentTarget.remove()}
            >
              <div className="flex h-full items-center justify-center">
                <Button
                  variant="ghost"
                  className="text-sm font-medium hover:bg-transparent"
                >
                  This comment contains spoilers.
                  <br />
                  Click to reveal.
                </Button>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{comment.text}</p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{comment.text}</p>
        )}
      </CardContent>
    </Card>
  );
}
