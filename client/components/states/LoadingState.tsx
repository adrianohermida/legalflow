import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  type?: "list" | "table" | "card" | "form" | "detail" | "spinner";
  rows?: number;
  columns?: number;
  showTitle?: boolean;
  title?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Skeleton components for different layouts
const ListSkeleton: React.FC<{ rows: number; showTitle: boolean }> = ({
  rows,
  showTitle,
}) => (
  <div className="space-y-4">
    {showTitle && <Skeleton className="h-6 w-48 mb-6" />}
    {Array.from({ length: rows }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const TableSkeleton: React.FC<{
  rows: number;
  columns: number;
  showTitle: boolean;
}> = ({ rows, columns, showTitle }) => (
  <div className="space-y-4">
    {showTitle && <Skeleton className="h-6 w-48 mb-6" />}
    <Card>
      <CardContent className="p-0">
        {/* Table Header */}
        <div className="border-b p-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>

        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b last:border-0 p-4">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

const CardSkeleton: React.FC<{ rows: number; showTitle: boolean }> = ({
  rows,
  showTitle,
}) => (
  <div className="space-y-4">
    {showTitle && <Skeleton className="h-6 w-48 mb-6" />}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex justify-between items-center mt-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const FormSkeleton: React.FC<{ showTitle: boolean }> = ({ showTitle }) => (
  <div className="space-y-6">
    {showTitle && <Skeleton className="h-6 w-48 mb-6" />}
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-20 w-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-18" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  </div>
);

const DetailSkeleton: React.FC<{ showTitle: boolean }> = ({ showTitle }) => (
  <div className="space-y-6">
    {showTitle && <Skeleton className="h-8 w-64 mb-6" />}

    {/* Header section */}
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-18" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Content sections */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center space-x-3 p-2 border rounded"
            >
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-3 border rounded">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

const SpinnerLoader: React.FC<{ title?: string; size: "sm" | "md" | "lg" }> = ({
  title,
  size,
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2
        className={`animate-spin text-brand-600 ${sizeClasses[size]} mb-4`}
      />
      {title && <p className="text-sm text-gray-600">{title}</p>}
    </div>
  );
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = "spinner",
  rows = 5,
  columns = 4,
  showTitle = true,
  title = "Carregando...",
  className = "",
  size = "md",
}) => {
  return (
    <div
      className={`w-full ${className}`}
      aria-busy="true"
      aria-label="Carregando conteúdo"
    >
      {type === "list" && <ListSkeleton rows={rows} showTitle={showTitle} />}
      {type === "table" && (
        <TableSkeleton rows={rows} columns={columns} showTitle={showTitle} />
      )}
      {type === "card" && <CardSkeleton rows={rows} showTitle={showTitle} />}
      {type === "form" && <FormSkeleton showTitle={showTitle} />}
      {type === "detail" && <DetailSkeleton showTitle={showTitle} />}
      {type === "spinner" && <SpinnerLoader title={title} size={size} />}
    </div>
  );
};

// Convenience components for common loading states
export const LoadingList: React.FC<Omit<LoadingStateProps, "type">> = (
  props,
) => <LoadingState {...props} type="list" />;

export const LoadingTable: React.FC<Omit<LoadingStateProps, "type">> = (
  props,
) => <LoadingState {...props} type="table" />;

export const LoadingCards: React.FC<Omit<LoadingStateProps, "type">> = (
  props,
) => <LoadingState {...props} type="card" />;

export const LoadingForm: React.FC<Omit<LoadingStateProps, "type">> = (
  props,
) => <LoadingState {...props} type="form" />;

export const LoadingDetail: React.FC<Omit<LoadingStateProps, "type">> = (
  props,
) => <LoadingState {...props} type="detail" />;

export const LoadingSpinner: React.FC<Omit<LoadingStateProps, "type">> = (
  props,
) => <LoadingState {...props} type="spinner" />;

export default LoadingState;
