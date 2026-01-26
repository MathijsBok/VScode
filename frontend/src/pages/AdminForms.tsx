import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formApi, fieldLibraryApi } from '../lib/api';
import Layout from '../components/Layout';
import { format } from 'date-fns';
import { Form, FormFieldLibrary } from '../types';

const AdminForms: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);

  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ['adminForms'],
    queryFn: async () => {
      const response = await formApi.getAll();
      return response.data as Form[];
    }
  });

  const { data: availableFields, isLoading: fieldsLoading } = useQuery({
    queryKey: ['fieldLibrary'],
    queryFn: async () => {
      const response = await fieldLibraryApi.getAll();
      return response.data as FormFieldLibrary[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await formApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Form created successfully');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminForms'] });
    },
    onError: () => {
      toast.error('Failed to create form');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await formApi.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Form updated successfully');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminForms'] });
    },
    onError: () => {
      toast.error('Failed to update form');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await formApi.delete(id);
    },
    onSuccess: () => {
      toast.success('Form deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminForms'] });
    },
    onError: () => {
      toast.error('Failed to delete form');
    }
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingFormId(null);
    setFormName('');
    setFormDescription('');
    setSelectedFieldIds([]);
  };

  const handleEdit = (form: Form) => {
    setEditingFormId(form.id);
    setFormName(form.name);
    setFormDescription(form.description || '');
    // Extract field IDs in order from formFields
    const fieldIds = form.formFields
      ?.sort((a, b) => a.order - b.order)
      .map(ff => ff.fieldId) || [];
    setSelectedFieldIds(fieldIds);
    setIsCreating(false);
  };

  const handleToggleField = (fieldId: string) => {
    if (selectedFieldIds.includes(fieldId)) {
      setSelectedFieldIds(selectedFieldIds.filter(id => id !== fieldId));
    } else {
      setSelectedFieldIds([...selectedFieldIds, fieldId]);
    }
  };

  const handleMoveFieldUp = (index: number) => {
    if (index === 0) return;
    const newSelectedFieldIds = [...selectedFieldIds];
    [newSelectedFieldIds[index - 1], newSelectedFieldIds[index]] =
      [newSelectedFieldIds[index], newSelectedFieldIds[index - 1]];
    setSelectedFieldIds(newSelectedFieldIds);
  };

  const handleMoveFieldDown = (index: number) => {
    if (index === selectedFieldIds.length - 1) return;
    const newSelectedFieldIds = [...selectedFieldIds];
    [newSelectedFieldIds[index], newSelectedFieldIds[index + 1]] =
      [newSelectedFieldIds[index + 1], newSelectedFieldIds[index]];
    setSelectedFieldIds(newSelectedFieldIds);
  };

  const handleRemoveField = (fieldId: string) => {
    setSelectedFieldIds(selectedFieldIds.filter(id => id !== fieldId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Form name is required');
      return;
    }

    const formData = {
      name: formName,
      description: formDescription,
      fieldIds: selectedFieldIds
    };

    if (editingFormId) {
      updateMutation.mutate({ id: editingFormId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isFormOpen = isCreating || editingFormId !== null;

  // Get field details for selected fields
  const selectedFields = selectedFieldIds
    .map(id => availableFields?.find(f => f.id === id))
    .filter(Boolean) as FormFieldLibrary[];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Form Management</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create and manage ticket submission forms
            </p>
          </div>
          <button
            onClick={() => {
              if (isFormOpen) {
                resetForm();
              } else {
                setIsCreating(true);
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isFormOpen ? 'Cancel' : 'New Form'}
          </button>
        </div>

        {/* Create/Edit Form */}
        {isFormOpen && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingFormId ? 'Edit Form' : 'Create New Form'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Form Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Technical Support Request"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Brief description of when to use this form"
                />
              </div>

              {/* Field Selection Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Available Fields
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 max-h-96 overflow-y-auto">
                    {fieldsLoading && (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    )}

                    {availableFields && availableFields.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-600">
                        {availableFields.map((field) => (
                          <label
                            key={field.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-600/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFieldIds.includes(field.id)}
                              onChange={() => handleToggleField(field.id)}
                              className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {field.label}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {field.fieldType}
                                </span>
                                {field.required && (
                                  <span className="text-xs text-red-600 dark:text-red-400">Required</span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        No fields available. Create fields in the Field Library first.
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Fields (Ordered) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Selected Fields (Drag to reorder)
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 max-h-96 overflow-y-auto">
                    {selectedFields.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-600">
                        {selectedFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-600/50"
                          >
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveFieldUp(index)}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveFieldDown(index)}
                                disabled={index === selectedFields.length - 1}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  {index + 1}.
                                </span>
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {field.label}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {field.fieldType}
                                </span>
                                {field.required && (
                                  <span className="text-xs text-red-600 dark:text-red-400">Required</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(field.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        No fields selected. Select fields from the left to add them to this form.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {(createMutation.isPending || updateMutation.isPending)
                    ? (editingFormId ? 'Updating...' : 'Creating...')
                    : (editingFormId ? 'Update Form' : 'Create Form')
                  }
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Forms List */}
        {formsLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {forms && forms.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fields
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {form.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {form.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {form.formFields?.length || 0} fields
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        form.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(form.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => handleEdit(form)}
                        className="text-primary hover:text-primary-dark dark:hover:text-primary-light"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this form?')) {
                            deleteMutation.mutate(form.id);
                          }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {forms && forms.length === 0 && !isFormOpen && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No forms</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new ticket form.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminForms;
