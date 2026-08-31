import { useState, useEffect } from 'react';
import styles from './Member.module.css';
import { useAuth } from '../context/useAuth';

interface Member {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at?: string;
  display_name?: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

interface CreateAccountForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

const EMPTY_CREATE_ACCOUNT_FORM: CreateAccountForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'user',
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function Member() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAccountForm>(EMPTY_CREATE_ACCOUNT_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<Member | null>(null);

  // Fetch members and roles from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRolesLoading(true);
        setError(null);
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No authentication token found');

        const authHeaders = { Authorization: `Bearer ${token}` };
        console.log('Attempting to fetch members from:', `${SERVER_URL}/api/users/getall`);

        const membersResponse = await fetch(`${SERVER_URL}/api/users/getall`, { headers: authHeaders });
        console.log('Members response status:', membersResponse.status);

        if (!membersResponse.ok) {
          const errorText = await membersResponse.text();
          console.error('Members response error:', errorText);
          throw new Error(`Failed to fetch members: ${membersResponse.status} ${membersResponse.statusText}`);
        }
        const membersData = await membersResponse.json();
        console.log('Fetched members:', membersData);
        setMembers(membersData);

        // Fetch available roles
        try {
          console.log('Attempting to fetch roles from:', `${SERVER_URL}/api/users/roles`);
          const rolesResponse = await fetch(`${SERVER_URL}/api/users/roles`, { headers: authHeaders });

          if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            console.log('Fetched roles:', rolesData);
            setRoles(rolesData);
          } else {
            console.warn('Failed to fetch roles, using default roles');
            // Fallback to default roles if fetch fails
            setRoles([
              { id: 1, name: 'user', display_name: 'User' },
              { id: 2, name: 'manager', display_name: 'Manager' },
              { id: 3, name: 'admin', display_name: 'Admin' },
            ]);
          }
        } catch (rolesError) {
          console.error('Error fetching roles:', rolesError);
          // Fallback to default roles
          setRoles([
            { id: 1, name: 'user', display_name: 'User' },
            { id: 2, name: 'manager', display_name: 'Manager' },
            { id: 3, name: 'admin', display_name: 'Admin' },
          ]);
        } finally {
          setRolesLoading(false);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(`${errorMessage} - Check if server is running on ${SERVER_URL}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const currentMember = user ? members.find((member) => member.id === user.id) : undefined;

  // Keep the current account pinned while filtering the other family members.
  const filteredMembers = members.filter((member) => {
    if (user && member.id === user.id) {
      return false;
    }
    // Apply search filter
    return (
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.display_name && member.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  const displayedMembers = currentMember ? [currentMember, ...filteredMembers] : filteredMembers;

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return styles.roleAdmin;
      case 'manager':
        return styles.roleManager;
      case 'user':
        return styles.roleUser;
      default:
        return styles.roleDefault;
    }
  };

  // Get role display name
  const getRoleDisplayName = (roleName: string, memberDisplayName?: string) => {
    // First try to use the display_name from the member data
    if (memberDisplayName) {
      return memberDisplayName;
    }

    // Fallback to finding the role in our roles array
    const role = roles.find((r) => r.name === roleName);
    if (role) {
      return role.display_name;
    }

    // Final fallback to capitalize the role name
    return roleName.charAt(0).toUpperCase() + roleName.slice(1);
  };

  // Get user avatar initials
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  // Handle view details
  const handleViewDetails = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
    setUpdateError(null);
    setUpdateSuccess(null);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
    setUpdateError(null);
    setUpdateSuccess(null);
  };

  const handleOpenCreateModal = () => {
    const defaultRole = roles.find((role) => role.name === 'user')?.name || roles[0]?.name || 'user';
    setCreateForm({ ...EMPTY_CREATE_ACCOUNT_FORM, role: defaultRole });
    setCreateError(null);
    setAccountSuccess(null);
    setCreatedAccount(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isCreating) return;
    setIsCreateModalOpen(false);
    setCreateError(null);
    setAccountSuccess(null);
    setCreatedAccount(null);
    setCreateForm(EMPTY_CREATE_ACCOUNT_FORM);
  };

  const handleCreateAnother = () => {
    const defaultRole = roles.find((role) => role.name === 'user')?.name || roles[0]?.name || 'user';
    setCreateForm({ ...EMPTY_CREATE_ACCOUNT_FORM, role: defaultRole });
    setCreateError(null);
    setAccountSuccess(null);
    setCreatedAccount(null);
  };

  const handleCreateFieldChange = (field: keyof CreateAccountForm, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Passwords do not match.');
      return;
    }

    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${SERVER_URL}/api/users/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: createForm.username,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
        }),
      });
      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseData?.message || 'Failed to create account.');
      }

      if (!responseData?.user) {
        throw new Error('The server did not return the created account.');
      }

      setMembers((current) => [responseData.user, ...current]);
      setAccountSuccess(responseData.message || 'Account created successfully.');
      setCreatedAccount(responseData.user);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle role update
  const handleRoleUpdate = async (newRole: string) => {
    if (!selectedMember || newRole === selectedMember.role) return;

    // Prevent self-editing
    if (user && selectedMember.id === user.id) {
      setUpdateError('You cannot modify your own role');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${SERVER_URL}/api/users/update-role/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = 'Failed to update role';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // If response is not JSON, assume success
        responseData = { message: 'Role updated successfully' };
      }

      // Refetch the updated member data
      try {
        const updatedMemberResponse = await fetch(`${SERVER_URL}/api/users/${selectedMember.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (updatedMemberResponse.ok) {
          const updatedMember = await updatedMemberResponse.json();
          // Update the members list with fresh data
          setMembers((prev) => prev.map((member) => (member.id === selectedMember.id ? updatedMember : member)));
          // Update selected member with fresh data
          setSelectedMember(updatedMember);
        } else {
          // Fallback: update with the new role and display name if refetch fails
          const roleDisplayName =
            roles.find((r) => r.name === newRole)?.display_name || newRole.charAt(0).toUpperCase() + newRole.slice(1);
          setMembers((prev) =>
            prev.map((member) =>
              member.id === selectedMember.id ? { ...member, role: newRole, display_name: roleDisplayName } : member
            )
          );
          setSelectedMember((prev) => (prev ? { ...prev, role: newRole, display_name: roleDisplayName } : null));
        }
      } catch (refetchError) {
        console.warn('Failed to refetch updated member, using optimistic update:', refetchError);
        // Fallback: update with the new role and display name
        const roleDisplayName =
          roles.find((r) => r.name === newRole)?.display_name || newRole.charAt(0).toUpperCase() + newRole.slice(1);
        setMembers((prev) =>
          prev.map((member) =>
            member.id === selectedMember.id ? { ...member, role: newRole, display_name: roleDisplayName } : member
          )
        );
        setSelectedMember((prev) => (prev ? { ...prev, role: newRole, display_name: roleDisplayName } : null));
      }

      setUpdateSuccess(responseData.message || 'Role updated successfully!');

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Role update error:', err);
      setUpdateError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Family Members</h1>
          <p className={styles.subtitle}>Manage and view all family members in your household</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{members.length}</span>
            <span className={styles.statLabel}>Total Members</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {members.filter((member) => member.role === 'admin').length}
            </span>
            <span className={styles.statLabel}>Admins</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Search family members by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        {user?.role === 'admin' && (
          <button type="button" className={styles.createAccountButton} onClick={handleOpenCreateModal}>
            <span aria-hidden="true">+</span>
            Create Account
          </button>
        )}
      </div>

      <div className={styles.memberGrid}>
        {displayedMembers.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <h3>No family members found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          displayedMembers.map((member) => {
            const isCurrentMember = Boolean(user && member.id === user.id);
            return (
            <div key={member.id} className={`${styles.memberCard} ${isCurrentMember ? styles.currentMemberCard : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>{getInitials(member.username)}</div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberNameRow}>
                    <h3 className={styles.memberName}>{member.username}</h3>
                    {isCurrentMember && <span className={styles.youBadge}>You</span>}
                  </div>
                  <p className={styles.memberEmail}>{member.email}</p>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.roleSection}>
                  <span className={styles.roleLabel}>Role</span>
                  <span className={`${styles.roleBadge} ${getRoleBadgeColor(member.role)}`}>
                    {getRoleDisplayName(member.role, member.display_name)}
                  </span>
                </div>

                {member.created_at && (
                  <div className={styles.joinedSection}>
                    <span className={styles.joinedLabel}>Joined</span>
                    <span className={styles.joinedDate}>{new Date(member.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                <button className={styles.actionButton} onClick={() => handleViewDetails(member)}>
                  <svg className={styles.actionIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {isCurrentMember ? 'View My Details' : 'View Details'}
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Create Account Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseCreateModal}>
          <form
            className={styles.modal}
            onSubmit={handleCreateAccount}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-title"
            aria-describedby="create-account-description"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="create-account-title">Create Account</h2>
                <p id="create-account-description" className={styles.modalDescription}>Create sign-in credentials and assign an access role.</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseCreateModal}
                aria-label="Close create account dialog"
                disabled={isCreating}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {createdAccount && accountSuccess ? (
                <>
                  <div className={styles.createSuccessAlert} role="status">
                    <span className={styles.createSuccessIcon} aria-hidden="true">✓</span>
                    <div>
                      <strong>{accountSuccess}</strong>
                      <p>The new account can now sign in using the credentials you provided.</p>
                    </div>
                  </div>

                  <div className={styles.createdAccountSummary} aria-label="Created account summary">
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Username</span>
                      <span className={styles.summaryValue}>{createdAccount.username}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Email</span>
                      <span className={styles.summaryValue}>{createdAccount.email}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Role</span>
                      <span className={`${styles.roleBadge} ${getRoleBadgeColor(createdAccount.role)}`}>
                        {getRoleDisplayName(createdAccount.role, createdAccount.display_name)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {createError && (
                    <div className={styles.errorMessage} role="alert">
                      {createError}
                    </div>
                  )}

                  <div className={styles.createFormGrid}>
                    <label className={styles.formField}>
                      <span>Username</span>
                      <input name="username" value={createForm.username} onChange={(event) => handleCreateFieldChange('username', event.target.value)} autoComplete="off" required disabled={isCreating} />
                    </label>

                    <label className={styles.formField}>
                      <span>Email</span>
                      <input name="email" type="email" value={createForm.email} onChange={(event) => handleCreateFieldChange('email', event.target.value)} autoComplete="off" required disabled={isCreating} />
                    </label>

                    <label className={styles.formField}>
                      <span>Temporary password</span>
                      <input name="password" type="password" value={createForm.password} onChange={(event) => handleCreateFieldChange('password', event.target.value)} autoComplete="new-password" minLength={8} required disabled={isCreating} />
                      <small>Use at least 8 characters.</small>
                    </label>

                    <label className={styles.formField}>
                      <span>Confirm password</span>
                      <input name="confirmPassword" type="password" value={createForm.confirmPassword} onChange={(event) => handleCreateFieldChange('confirmPassword', event.target.value)} autoComplete="new-password" minLength={8} required disabled={isCreating} />
                    </label>

                    <label className={styles.formField}>
                      <span>Role</span>
                      <select name="role" value={createForm.role} onChange={(event) => handleCreateFieldChange('role', event.target.value)} required disabled={isCreating || rolesLoading}>
                        {roles.map((role) => (
                          <option key={role.id} value={role.name}>{role.display_name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className={`${styles.modalFooter} ${styles.createModalFooter}`}>
              {createdAccount ? (
                <>
                  <button type="button" className={styles.closeModalButton} onClick={handleCreateAnother}>Create Another</button>
                  <button type="button" className={styles.submitAccountButton} onClick={handleCloseCreateModal}>Done</button>
                </>
              ) : (
                <>
                  <button type="button" className={styles.closeModalButton} onClick={handleCloseCreateModal} disabled={isCreating}>Cancel</button>
                  <button type="submit" className={styles.submitAccountButton} disabled={isCreating || rolesLoading}>
                    {isCreating ? 'Creating…' : 'Create Account'}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Member Details Modal */}
      {isModalOpen && selectedMember && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={user && selectedMember.id === user.id ? 'Your account details' : 'Family member details'}
          >
            <div className={`${styles.modalHeader} ${styles.detailsModalHeader}`}>
              <h2 className={styles.detailsModalTitle}>Details</h2>
              <button className={styles.closeButton} onClick={handleCloseModal} aria-label="Close member details">
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.memberProfile}>
                <div className={styles.profileAvatar}>{getInitials(selectedMember.username)}</div>
                <div className={styles.profileInfo}>
                  <h3>{selectedMember.username}</h3>
                  <p>{selectedMember.email}</p>
                </div>
              </div>

              <div className={styles.detailsSection}>
                <h4>Account Information</h4>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Username:</span>
                  <span className={styles.detailValue}>{selectedMember.username}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Email:</span>
                  <span className={styles.detailValue}>{selectedMember.email}</span>
                </div>
                {selectedMember.created_at && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Joined:</span>
                    <span className={styles.detailValue}>
                      {new Date(selectedMember.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Role:</span>
                  <span className={styles.detailValue}>
                    <span className={`${styles.roleBadge} ${getRoleBadgeColor(selectedMember.role)}`}>
                      {getRoleDisplayName(selectedMember.role, selectedMember.display_name)}
                    </span>
                  </span>
                </div>
              </div>

              {user && selectedMember.id === user.id && (
                <div className={styles.selfRoleNotice} role="note">
                  <span aria-hidden="true">ⓘ</span>
                  <span>Your role cannot be changed from this page. Another administrator must update it.</span>
                </div>
              )}

              {/* Only show role management if current user is admin */}
              {user && user.role === 'admin' && selectedMember.id !== user.id && (
                <div>
                  <div className={`${styles.roleSection} ${styles.roleManagementSection}`}>
                    <h4>Role Management</h4>
                    <div className={styles.roleActions}>
                      <label className={styles.roleLabel}>Change Role:</label>
                      <div className={styles.roleDropdownContainer}>
                        <select
                          className={styles.roleDropdown}
                          value={selectedMember.role}
                          onChange={(e) => handleRoleUpdate(e.target.value)}
                          disabled={isUpdating || rolesLoading}
                        >
                          {roles.length === 0 ? (
                            <option value={selectedMember.role}>
                              {selectedMember.role.charAt(0).toUpperCase() + selectedMember.role.slice(1)}
                            </option>
                          ) : (
                            roles.map((role) => (
                              <option key={role.id} value={role.name}>
                                {role.display_name}
                              </option>
                            ))
                          )}
                        </select>
                        <div className={styles.dropdownIcon}>
                          {isUpdating ? (
                            <div className={styles.spinner}></div>
                          ) : (
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ minHeight: '20px' }}>
                    {updateError && (
                      <div className={styles.errorMessage}>
                        <strong>Error:</strong> {updateError}
                      </div>
                    )}

                    {updateSuccess && (
                      <div className={styles.successMessage}>
                        <strong>Success:</strong> {updateSuccess}
                      </div>
                    )}

                    {isUpdating && (
                      <div className={styles.updating}>
                        <div className={styles.spinner}></div>
                        <span>Updating role...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
