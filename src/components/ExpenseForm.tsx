import { FileText, Loader2, Save, Upload, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ExpenseFormData } from "../types/expense";
import { getExpenseCategories } from "../utils/expenseUtils";
import {
  formatFileSize,
  isValidReceiptFile,
  parseReceiptFile,
} from "../utils/receiptParser";

const DEFAULT_FORM_DATA: ExpenseFormData = {
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  category: "",
  reimbursed: false,
};

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData | ExpenseFormData[]) => void;
  initialData?: ExpenseFormData;
  title: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const [formData, setFormData] = useState<ExpenseFormData>(DEFAULT_FORM_DATA);

  const [formDataList, setFormDataList] = useState<ExpenseFormData[]>([]);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const categories = getExpenseCategories();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    // Clear uploaded files when form is reset/reopened
    setUploadedFiles([]);
    setFormDataList([]);
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If multiple files, submit all forms
    if (uploadedFiles.length > 1) {
      const invalidForms = formDataList.some(
        (form) => !form.description.trim() || !form.amount || !form.category
      );
      if (invalidForms) {
        toast.error("Please fill in all required fields for each expense.");
        return;
      }
      onSubmit(formDataList);
    } else {
      // Single form submission
      if (
        !formData.description.trim() ||
        !formData.amount ||
        !formData.category
      ) {
        return;
      }
      onSubmit(formData);
    }
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(isValidReceiptFile);

    if (validFiles.length === 0) {
      toast.error(
        "Please upload valid image files (JPG, PNG, WebP) or PDF files under 10MB."
      );
      return;
    }

    // Filter out duplicate files
    const newFiles = validFiles.filter((newFile) => {
      return !uploadedFiles.some(
        (existingFile) =>
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size &&
          existingFile.lastModified === newFile.lastModified
      );
    });

    if (newFiles.length === 0) {
      toast.error("All selected files have already been uploaded.");
      return;
    }

    if (newFiles.length < validFiles.length) {
      const duplicateCount = validFiles.length - newFiles.length;
      const fileText = duplicateCount === 1 ? "file was" : "files were";
      toast.success(
        `${duplicateCount} duplicate ${fileText} skipped. Only new files will be added.`
      );
    }

    // Append new files to existing ones
    const allFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(allFiles);

    if (allFiles.length === 1 && uploadedFiles.length === 0) {
      // First single file - parse into main form
      await parseReceipt(allFiles[0]);
    } else {
      // Multiple files or adding to existing - create/update form data for each
      const existingForms =
        uploadedFiles.length > 1
          ? formDataList
          : uploadedFiles.length === 1
          ? [formData]
          : [];
      const newForms = newFiles.map(() => ({ ...DEFAULT_FORM_DATA }));

      const allForms = [...existingForms, ...newForms];
      setFormDataList(allForms);

      // Parse only the new files
      for (let i = 0; i < newFiles.length; i++) {
        await parseReceiptForIndex(newFiles[i], uploadedFiles.length + i);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const parseReceipt = async (file: File) => {
    setIsParsingReceipt(true);
    try {
      const parsedData = await parseReceiptFile(file);
      if (parsedData) {
        setFormData((prev) => ({
          ...prev,
          description: parsedData.description,
          amount: parsedData.amount,
          date: parsedData.date,
          category: parsedData.category,
        }));
      }
    } catch (error) {
      console.error("Failed to parse receipt:", error);
      toast.error(
        "Failed to parse receipt. Please fill in the details manually."
      );
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const parseReceiptForIndex = async (file: File, index: number) => {
    try {
      const parsedData = await parseReceiptFile(file);
      if (parsedData) {
        setFormDataList((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  description: parsedData.description,
                  amount: parsedData.amount,
                  date: parsedData.date,
                  category: parsedData.category,
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error(`Failed to parse receipt ${index + 1}:`, error);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length > 1) {
      setFormDataList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleMultiFormChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormDataList((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [name]:
                type === "checkbox"
                  ? (e.target as HTMLInputElement).checked
                  : value,
            }
          : item
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
      style={{ overflow: "hidden" }}
    >
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-xl w-full max-w-[calc(100vw-16px)] sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-4">
            {/* Receipt Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {uploadedFiles.length === 0
                  ? "Upload Receipt (Optional)"
                  : "Add More Receipts"}
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="receipt-upload"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isParsingReceipt}
                />
                <label
                  htmlFor="receipt-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload
                    className={`w-8 h-8 ${
                      isDragOver ? "text-blue-500" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isDragOver ? "text-blue-700" : "text-gray-600"
                    }`}
                  >
                    {isDragOver
                      ? "Drop files here"
                      : uploadedFiles.length === 0
                      ? "Click to upload or drag and drop receipt images or PDFs"
                      : "Click to add more files or drag and drop additional receipts"}
                  </span>
                  <span className="text-xs text-gray-500">
                    Supports JPG, PNG, WebP, PDF (max 10MB each)
                  </span>
                </label>
              </div>
            </div>

            {/* Show forms - either from uploaded files or manual entry */}
            <div className="space-y-6">
              {uploadedFiles.length > 1 && (
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Expense Forms ({uploadedFiles.length})
                  </h3>
                </div>
              )}

              {/* Parsing Status */}
              {isParsingReceipt && (
                <div className="mb-4 flex items-center space-x-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Parsing receipt...</span>
                </div>
              )}

              {(uploadedFiles.length > 1 ? formDataList : [formData]).map(
                (currentFormData, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    {uploadedFiles.length > 0 && (
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {uploadedFiles.length > 1
                              ? `Expense ${index + 1}: `
                              : ""}
                            {uploadedFiles[index]?.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({formatFileSize(uploadedFiles[index]?.size || 0)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isParsingReceipt}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          name="description"
                          value={currentFormData.description}
                          onChange={(e) =>
                            uploadedFiles.length > 1
                              ? handleMultiFormChange(index, e)
                              : handleChange(e)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter expense description"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          name="amount"
                          value={currentFormData.amount}
                          onChange={(e) =>
                            uploadedFiles.length > 1
                              ? handleMultiFormChange(index, e)
                              : handleChange(e)
                          }
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={currentFormData.date}
                          onChange={(e) =>
                            uploadedFiles.length > 1
                              ? handleMultiFormChange(index, e)
                              : handleChange(e)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          name="category"
                          value={currentFormData.category}
                          onChange={(e) =>
                            uploadedFiles.length > 1
                              ? handleMultiFormChange(index, e)
                              : handleChange(e)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select category</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            name="reimbursed"
                            checked={currentFormData.reimbursed}
                            onChange={(e) =>
                              uploadedFiles.length > 1
                                ? handleMultiFormChange(index, e)
                                : handleChange(e)
                            }
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label className="text-sm font-medium text-gray-700">
                            Already reimbursed
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </form>
        </div>

        <div className="flex-shrink-0 p-3 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              aria-label="Cancel expense form"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              disabled={isParsingReceipt}
              aria-label={
                uploadedFiles.length > 1
                  ? `Save all ${uploadedFiles.length} expenses`
                  : "Save expense"
              }
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">
                {uploadedFiles.length > 1
                  ? `Save All (${uploadedFiles.length})`
                  : "Save"}
              </span>
              <span className="sm:hidden">
                {uploadedFiles.length > 1
                  ? `Save (${uploadedFiles.length})`
                  : "Save"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
