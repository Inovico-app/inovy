import { KindeUserService } from "../services";

export async function getOrganizationMembers(orgCode: string): Promise<
  Array<{
    id: string;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    roles?: string[];
  }>
> {
  const result = await KindeUserService.getUsersByOrganization(orgCode);
  if (result.isErr()) {
    throw new Error(result.error.message);
  }
  return result.value.map((user) => ({
    id: user.id,
    email: user.email || null,
    given_name: user.given_name || null,
    family_name: user.family_name || null,
    roles: user.roles || [],
  }));
}

