import type { Meta, StoryObj } from "@storybook/react";
import { useState, useCallback } from "react";
import InfiniteScroll from "./infinite-scroll";

const meta: Meta<typeof InfiniteScroll> = {
  title: "Primitives/InfiniteScroll",
  component: InfiniteScroll,
};

export default meta;
type Story = StoryObj<typeof InfiniteScroll>;

export const Default: Story = {
  render: () => {
    const [items, setItems] = useState(
      Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`)
    );
    const [loading, setLoading] = useState(false);

    const loadMore = useCallback(() => {
      setLoading(true);
      setTimeout(() => {
        setItems((prev) => [
          ...prev,
          ...Array.from(
            { length: 10 },
            (_, i) => `Item ${prev.length + i + 1}`
          ),
        ]);
        setLoading(false);
      }, 1000);
    }, []);

    return (
      <div className="h-[300px] overflow-auto w-[300px] border rounded-md">
        <InfiniteScroll
          isLoading={loading}
          hasMore={items.length < 100}
          next={loadMore}
        >
          {items.map((item) => (
            <div key={item} className="p-3 border-b">
              {item}
            </div>
          ))}
        </InfiniteScroll>
        {loading && (
          <div className="p-3 text-center text-sm text-muted-foreground">
            Loading more...
          </div>
        )}
      </div>
    );
  },
};