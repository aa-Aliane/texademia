import { useQuery } from "@tanstack/react-query";
import { getTemplates } from "../api/redaction";

export function useTemplates() {

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
  });

  return { data, isLoading, isError, error };
}
