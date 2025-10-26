
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
  permissions?: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

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

  // Fetch members and roles from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRolesLoading(true);
        setError(null);
        console.log('Attempting to fetch members from:', `${SERVER_URL}/api/users/getall`);
        
        const membersResponse = await fetch(`${SERVER_URL}/api/users/getall`);
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
          const rolesResponse = await fetch(`${SERVER_URL}/api/users/roles`);
          
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
              { id: 3, name: 'admin', display_name: 'Admin' }
            ]);
          }
        } catch (rolesError) {
          console.error('Error fetching roles:', rolesError);
          // Fallback to default roles
          setRoles([
            { id: 1, name: 'user', display_name: 'User' },
            { id: 2, name: 'manager', display_name: 'Manager' },
            { id: 3, name: 'admin', display_name: 'Admin' }
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

  // Filter members based on search term and exclude current user
  const filteredMembers = members.filter(member => {
    // Exclude current user
    if (user && member.id === user.id) {
      return false;
    }
    // Apply search filter
    return (
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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

  // Handle role update
  const handleRoleUpdate = async (newRole: string) => {
    if (!selectedMember || newRole === selectedMember.role) return;
    
    // Prevent self-editing
    if (user && selectedMember.id === user.id) {
      setUpdateError("You cannot modify your own role");
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
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
        const updatedMemberResponse = await fetch(`${SERVER_URL}/api/users/${selectedMember.id}`);
        if (updatedMemberResponse.ok) {
          const updatedMember = await updatedMemberResponse.json();
          // Update the members list with fresh data
          setMembers(prev => prev.map(member => 
            member.id === selectedMember.id 
              ? updatedMember
              : member
          ));
          // Update selected member with fresh data
          setSelectedMember(updatedMember);
        } else {
          // Fallback: update with the new role if refetch fails
          setMembers(prev => prev.map(member => 
            member.id === selectedMember.id 
              ? { ...member, role: newRole }
              : member
          ));
          setSelectedMember(prev => prev ? { ...prev, role: newRole } : null);
        }
      } catch (refetchError) {
        console.warn('Failed to refetch updated member, using optimistic update:', refetchError);
        // Fallback: update with the new role
        setMembers(prev => prev.map(member => 
          member.id === selectedMember.id 
            ? { ...member, role: newRole }
            : member
        ));
        setSelectedMember(prev => prev ? { ...prev, role: newRole } : null);
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
          <h1 className={styles.title}>Team Members</h1>
          <p className={styles.subtitle}>
            Manage and view all team members in your organization
          </p>
        </div>
        
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{filteredMembers.length}</span>
            <span className={styles.statLabel}>Total Members</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {user && user.role === 'admin' ? filteredMembers.filter(m => m.role === 'admin').length + 1 : filteredMembers.filter(m => m.role === 'admin').length}
            </span>
            <span className={styles.statLabel}>Admins</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search members by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.memberGrid}>
        {filteredMembers.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <h3>No members found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {getInitials(member.username)}
                </div>
                <div className={styles.memberInfo}>
                  <h3 className={styles.memberName}>{member.username}</h3>
                  <p className={styles.memberEmail}>{member.email}</p>
                </div>
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.roleSection}>
                  <span className={styles.roleLabel}>Role</span>
                  <span className={`${styles.roleBadge} ${getRoleBadgeColor(member.role)}`}>
                    {member.display_name || member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>
                
                {member.created_at && (
                  <div className={styles.joinedSection}>
                    <span className={styles.joinedLabel}>Joined</span>
                    <span className={styles.joinedDate}>
                      {new Date(member.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>



              <div className={styles.cardActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => handleViewDetails(member)}
                >
                  <svg className={styles.actionIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Member Details Modal */}
      {isModalOpen && selectedMember && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Member Details</h2>
              <button 
                className={styles.closeButton}
                onClick={handleCloseModal}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.memberProfile}>
                <div className={styles.profileAvatar}>
                  {getInitials(selectedMember.username)}
                </div>
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
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Role:</span>
                  <span className={styles.detailValue}><span className={`${styles.roleBadge} ${getRoleBadgeColor(selectedMember.role)}`}>
                    {selectedMember.display_name || selectedMember.role.charAt(0).toUpperCase() + selectedMember.role.slice(1)}
                  </span></span>
                </div>
              </div>

              {/* Only show role management if current user is admin */}
              {user && user.role === 'admin' && (
                <div>
                <div className={styles.roleSection}>
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
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>

                  <div style={{minHeight : '20px'}}>
                    
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

            <div className={styles.modalFooter}>
              <button 
                className={styles.closeModalButton}
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}