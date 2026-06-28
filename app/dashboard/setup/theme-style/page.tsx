"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";

export default function ThemeStylePage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("admin");

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">{t("setup.themeStyle.title")}</h1>
                <Button variant="outline">{t("setup.themeStyle.reset")}</Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="admin">{t("setup.themeStyle.tabAdmin")}</TabsTrigger>
                    <TabsTrigger value="customers">{t("setup.themeStyle.tabCustomers")}</TabsTrigger>
                    <TabsTrigger value="buttons">{t("setup.themeStyle.tabButtons")}</TabsTrigger>
                    <TabsTrigger value="modals">{t("setup.themeStyle.tabModals")}</TabsTrigger>
                    <TabsTrigger value="tables">{t("setup.themeStyle.tabTables")}</TabsTrigger>
                    <TabsTrigger value="general">{t("setup.themeStyle.tabGeneral")}</TabsTrigger>
                    <TabsTrigger value="tags">{t("setup.themeStyle.tabTags")}</TabsTrigger>
                    <TabsTrigger value="custom">{t("setup.themeStyle.tabCustomCss")}</TabsTrigger>
                </TabsList>

                <TabsContent value="admin" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        {/* Sidebar Colors */}
                        <div>
                            <Label>{t("setup.themeStyle.sidebarBgColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#FFFFFF" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.sidebarLinksColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#333333" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#333333" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.sidebarActiveItemBgColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F5F5F5" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#F5F5F5" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.sidebarActiveItemColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#000000" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#000000" }}></div>
                            </div>
                        </div>

                        {/* Top Header Colors */}
                        <div className="border-t pt-6">
                            <Label>{t("setup.themeStyle.topHeaderBgColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#FFFFFF" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.topHeaderLinksColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#333333" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#333333" }}></div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="border-t pt-6">
                            <Label>{t("setup.themeStyle.mainContentBgColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F9FAFB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#F9FAFB" }}></div>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>

                <TabsContent value="customers" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>{t("setup.themeStyle.navBgColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#FFFFFF" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.navLinksColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#333333" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#333333" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.footerBg")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F9FAFB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#F9FAFB" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.footerTextColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#6B7280" }}></div>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>

                <TabsContent value="buttons" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>{t("setup.themeStyle.buttonDefault")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#E5E7EB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#E5E7EB" }}></div>
                                <Button variant="outline">{t("setup.themeStyle.buttonDefault")}</Button>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.buttonPrimary")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#1F2937" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#1F2937" }}></div>
                                <Button className="bg-gray-900 text-white">{t("setup.themeStyle.buttonPrimary")}</Button>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.buttonInfo")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#3B82F6" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#3B82F6" }}></div>
                                <Button className="bg-blue-600 text-white">{t("setup.themeStyle.buttonInfo")}</Button>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.buttonSuccess")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#10B981" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#10B981" }}></div>
                                <Button className="bg-green-600 text-white">{t("setup.themeStyle.buttonSuccess")}</Button>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.buttonDanger")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#EF4444" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#EF4444" }}></div>
                                <Button className="bg-red-600 text-white">{t("setup.themeStyle.buttonDanger")}</Button>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>

                <TabsContent value="modals" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>{t("setup.themeStyle.headingBackground")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#FFFFFF" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.headingColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#111827" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#111827" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.closeButtonColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#6B7280" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.modalHeaderTextColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#111827" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#111827" }}></div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="border-t pt-6">
                            <h3 className="font-medium mb-4">{t("setup.themeStyle.exampleModalHeading")}</h3>
                            <div className="bg-white border rounded-lg shadow-lg p-4">
                                <div className="flex items-center justify-between border-b pb-3 mb-3">
                                    <h4 className="font-semibold">{t("setup.themeStyle.sampleText")}</h4>
                                    <button className="text-gray-400 hover:text-gray-600">×</button>
                                </div>
                                <p className="text-sm text-gray-600">{t("setup.themeStyle.modalBody")}</p>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>

                <TabsContent value="tables" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>{t("setup.themeStyle.tableLinksColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#3B82F6" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#3B82F6" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.tableLinksHoverColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#2563EB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#2563EB" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.tableHeadingsColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#111827" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#111827" }}></div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="border-t pt-6">
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-medium">
                                                {t("setup.themeStyle.exampleHeading1")}
                                            </th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">
                                                {t("setup.themeStyle.exampleHeading2")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t">
                                            <td className="px-4 py-2 text-sm">{t("setup.themeStyle.exampleHeading1")}</td>
                                            <td className="px-4 py-2 text-sm">{t("setup.themeStyle.exampleHeading2")}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.itemsTableHeadingsBgColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#F9FAFB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#F9FAFB" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.itemsTableHeadingsTextColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#6B7280" }}></div>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-6">
                        <div>
                            <Label>{t("setup.themeStyle.linksColorHref")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#3B82F6" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#3B82F6" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.linksHoverColor")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#2563EB" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#2563EB" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.adminLoginBackground")}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input className="flex-1" placeholder="#FFFFFF" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#FFFFFF" }}></div>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.textMuted")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#6B7280" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#6B7280" }}></div>
                                <span className="text-gray-500 text-sm">{t("setup.themeStyle.exampleTextMuted")}</span>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.textDanger")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#DC2626" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#DC2626" }}></div>
                                <span className="text-red-600 text-sm">{t("setup.themeStyle.exampleTextDanger")}</span>
                            </div>
                        </div>

                        <div>
                            <Label>{t("setup.themeStyle.textWarning")}</Label>
                            <div className="flex gap-2 mt-2 items-center">
                                <Input className="flex-1" placeholder="#F59E0B" />
                                <div className="w-12 h-10 border rounded" style={{ backgroundColor: "#F59E0B" }}></div>
                                <span className="text-amber-600 text-sm">{t("setup.themeStyle.exampleTextWarning")}</span>
                            </div>
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>

                <TabsContent value="tags" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6 space-y-4">
                        <p className="text-sm text-gray-600">
                            {t("setup.themeStyle.tagsDescription")}
                        </p>
                        <div className="space-y-4">
                            {[
                                { id: "Primary", label: t("setup.themeStyle.tagPrimaryColor") },
                                { id: "Success", label: t("setup.themeStyle.tagSuccessColor") },
                                { id: "Info", label: t("setup.themeStyle.tagInfoColor") },
                                { id: "Warning", label: t("setup.themeStyle.tagWarningColor") },
                                { id: "Danger", label: t("setup.themeStyle.tagDangerColor") },
                            ].map((tag) => (
                                <div key={tag.id}>
                                    <Label>{tag.label}</Label>
                                    <div className="flex gap-2 mt-2">
                                        <Input className="flex-1" placeholder="#3B82F6" />
                                        <div className="w-12 h-10 border rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>

                <TabsContent value="custom" className="space-y-6 mt-6">
                    <div className="bg-white rounded-lg border p-6">
                        <Label className="mb-2 block">{t("setup.themeStyle.customCssLabel")}</Label>
                        <textarea
                            className="w-full h-96 p-4 border rounded-md font-mono text-sm"
                            placeholder={t("setup.themeStyle.customCssPlaceholder")}
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            {t("setup.themeStyle.customCssDescription")}
                        </p>
                    </div>

                    <Button className="bg-gray-900 text-white hover:bg-gray-800">{t("common.save")}</Button>
                </TabsContent>
            </Tabs>
        </div>
    );
}
