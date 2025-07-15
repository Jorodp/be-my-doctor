import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EditPatientProfile } from './EditPatientProfile';
import { EditDoctorProfileAdvanced } from './EditDoctorProfileAdvanced';
import { EditAssistantProfile } from './EditAssistantProfile';
import { Pencil, Trash2, Plus, Search, Settings } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    role?: string;
    full_name?: string;
    assigned_doctor_id?: string;
  };
  profile?: {
    role: string;
    full_name: string;
    phone?: string;
    address?: string;
  };
  doctorProfile?: {
    verification_status: string;
    specialty?: string;
    professional_license?: string;
  };
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<any>(null);
  const [profileType, setProfileType] = useState<'patient' | 'doctor' | 'assistant' | null>(null);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'patient' as 'patient' | 'doctor' | 'assistant' | 'admin',
    fullName: '',
    specialty: '',
    professionalLicense: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'list' }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast({
          title: "Error",
          description: `Failed to fetch users: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        console.error('Function returned error:', data.error);
        toast({
          title: "Error",
          description: `Failed to fetch users: ${data.error}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Users data:', data);
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: `Failed to fetch users: ${error.message || error}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'create',
          email: formData.email,
          password: formData.password,
          role: formData.role,
          fullName: formData.fullName,
          specialty: formData.specialty,
          professionalLicense: formData.professionalLicense
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: `Failed to create user: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        toast({
          title: "Error",
          description: `Failed to create user: ${data.error}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message || error}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'update',
          userId: selectedUser.id,
          email: formData.email || undefined,
          password: formData.password || undefined,
          role: formData.role,
          fullName: formData.fullName
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: `Failed to update user: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        toast({
          title: "Error",
          description: `Failed to update user: ${data.error}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message || error}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { 
          action: 'delete',
          userId: userId 
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: `Failed to delete user: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        toast({
          title: "Error",
          description: `Failed to delete user: ${data.error}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message || error}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'patient',
      fullName: '',
      specialty: '',
      professionalLicense: ''
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: (user.profile?.role || user.user_metadata?.role || 'patient') as any,
      fullName: user.profile?.full_name || user.user_metadata?.full_name || '',
      specialty: user.doctorProfile?.specialty || '',
      professionalLicense: user.doctorProfile?.professional_license || ''
    });
    setIsEditDialogOpen(true);
  };

  const openProfileEditor = async (user: User) => {
    const role = user.profile?.role || user.user_metadata?.role || 'patient';
    
    try {
      // Fetch complete profile data
      const { data, error } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'get-profile',
          userId: user.id
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Add email and assigned_doctor_id to profile data
      const enrichedProfile = {
        ...data.profile,
        email: user.email,
        assigned_doctor_id: user.user_metadata?.assigned_doctor_id
      };

      setProfileToEdit({
        profile: enrichedProfile,
        doctorProfile: data.doctorProfile
      });
      setProfileType(role as 'patient' | 'doctor' | 'assistant');
      setIsEditProfileOpen(true);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el perfil",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'doctor': return 'default';
      case 'assistant': return 'secondary';
      case 'patient': return 'outline';
      default: return 'outline';
    }
  };

  const getVerificationBadgeVariant = (status: string) => {
    switch (status) {
      case 'verified': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the platform.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              
              {formData.role === 'doctor' && (
                <>
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="Medical specialty"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="license">Professional License</Label>
                    <Input
                      id="license"
                      value={formData.professionalLicense}
                      onChange={(e) => setFormData(prev => ({ ...prev, professionalLicense: e.target.value }))}
                      placeholder="License number"
                    />
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Edit Dialogs */}
        {profileType === 'patient' && (
          <EditPatientProfile
            isOpen={isEditProfileOpen}
            onClose={() => {
              setIsEditProfileOpen(false);
              setProfileToEdit(null);
              setProfileType(null);
            }}
            patientProfile={profileToEdit?.profile}
            onProfileUpdated={() => {
              fetchUsers();
              setIsEditProfileOpen(false);
              setProfileToEdit(null);
              setProfileType(null);
            }}
          />
        )}

        {profileType === 'doctor' && (
          <EditDoctorProfileAdvanced
            isOpen={isEditProfileOpen}
            onClose={() => {
              setIsEditProfileOpen(false);
              setProfileToEdit(null);
              setProfileType(null);
            }}
            doctorProfile={profileToEdit?.doctorProfile}
            profile={profileToEdit?.profile}
            onProfileUpdated={() => {
              fetchUsers();
              setIsEditProfileOpen(false);
              setProfileToEdit(null);
              setProfileType(null);
            }}
          />
        )}

        {profileType === 'assistant' && (
          <EditAssistantProfile
            isOpen={isEditProfileOpen}
            onClose={() => {
              setIsEditProfileOpen(false);
              setProfileToEdit(null);
              setProfileType(null);
            }}
            assistantProfile={profileToEdit?.profile}
            onProfileUpdated={() => {
              fetchUsers();
              setIsEditProfileOpen(false);
              setProfileToEdit(null);
              setProfileType(null);
            }}
          />
        )}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Complete list of platform users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.profile?.full_name || user.user_metadata?.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.profile?.role || user.user_metadata?.role || 'patient')}>
                      {user.profile?.role || user.user_metadata?.role || 'patient'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.doctorProfile ? (
                      <Badge variant={getVerificationBadgeVariant(user.doctorProfile.verification_status)}>
                        {user.doctorProfile.verification_status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        title="Editar usuario básico"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProfileEditor(user)}
                        title="Editar perfil completo"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.email}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-password">New Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter new password or leave empty"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}