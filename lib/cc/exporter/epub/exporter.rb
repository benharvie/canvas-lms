# frozen_string_literal: true

#
# Copyright (C) 2015 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.

module CC::Exporter::Epub
  class Exporter
    include CC::Exporter::Epub::ModuleSorter

    RESOURCE_TITLES = {
      toc: I18n.t("Table Of Contents"),
      syllabus: I18n.t("Syllabus"),
      modules: I18n.t("Modules"),
      assignments: I18n.t("Assignments"),
      announcements: I18n.t("Announcements"),
      topics: I18n.t("Discussion Topics"),
      quizzes: I18n.t("Quizzes"),
      pages: I18n.t("Pages"),
      files: I18n.t("Files")
    }.freeze

    LINKED_RESOURCE_KEY = {
      "Assignment" => :assignments,
      "Attachment" => :files,
      "DiscussionTopic" => :topics,
      "Quizzes::Quiz" => :quizzes,
      "WikiPage" => :pages
    }.freeze

    def initialize(cartridge, sort_by_content = false, export_type = :epub, global_identifiers: false)
      @cartridge = cartridge
      @export_type = export_type
      @sort_by_content = sort_by_content || cartridge_json[:modules].empty?
      @global_identifiers = global_identifiers
    end
    attr_reader :cartridge, :sort_by_content, :global_identifiers

    delegate :unsupported_files, to: :cartridge_converter, allow_nil: true

    def cartridge_json
      @_cartridge_json ||= cartridge_converter.export(@export_type)
    end

    def templates
      @_templates ||= {
        title: cartridge_json[:title],
        files: cartridge_json[:files],
        toc: toc,
        syllabus: create_universal_template(:syllabus),
        announcements: create_universal_template(:announcements)
      }.tap do |hash|
        resources = sort_by_content ? LINKED_RESOURCE_KEY.except("Attachment").values : module_ids
        remove_hidden_content_from_syllabus!
        resources.each do |resource_type|
          hash.merge!(resource_type => create_content_template(resource_type))
        end
      end
    end

    # Prefix of names of all files generated by this export
    def filename_prefix
      @filename_prefix ||= begin
        title = cartridge_json[:title] || ""
        name = CanvasTextHelper.truncate_text(title.path_safe, { max_length: 200, ellipsis: "" })
        timestamp = Time.zone.now.strftime("%Y-%b-%d_%H-%M-%S")
        "#{name}-#{timestamp}"
      end
    end

    def toc
      @_toc ||= create_universal_template(:toc)
    end

    def get_item(resource_type, identifier)
      return {} unless cartridge_json[resource_type].present?

      cartridge_json[resource_type].find(-> { return {} }) do |resource|
        resource[:identifier] == identifier
      end
    end

    def update_item(resource_type, identifier, updated_item)
      get_item(resource_type, identifier).merge!(updated_item)
    end

    def item_ids
      @_item_ids ||= cartridge_json.values_at(*LINKED_RESOURCE_KEY.values).flatten.pluck(:identifier)
    end

    def get_syllabus_item(identifier)
      cartridge_json[:syllabus].find(-> { {} }) do |syllabus_item|
        syllabus_item[:identifier] == identifier
      end
    end

    def update_syllabus_item(identifier, updated_item)
      get_syllabus_item(identifier).merge!(updated_item)
    end

    def create_universal_template(resource)
      template_content = cartridge_json[resource] || []
      template = Exporter.resource_template(resource)
      Template.new({ resources: template_content, reference: resource }, template, self)
    end

    def create_content_template(resource)
      resource_content = sort_by_content ? cartridge_json[resource] : filter_content_to_module(resource)
      update_table_of_contents(resource, resource_content)
      Template.new({ resources: resource_content, reference: resource }, base_template, self)
    end

    def update_table_of_contents(resource, resource_content)
      @_toc.content << {
        reference: resource,
        title: RESOURCE_TITLES[resource] || resource_content[:title],
        resource_content: sort_by_content ? resource_content : resource_content[:items]
      }
    end

    def base_template
      if sort_by_content
        "../templates/content_sorting_template.html.erb"
      else
        "../templates/module_sorting_template.html.erb"
      end
    end

    def self.resource_template(resource)
      "../templates/#{resource}_template.html.erb"
    end

    def cleanup_files
      cartridge_converter.delete_unzipped_archive
    end

    private

    def cartridge_converter
      @_cartridge_converter ||= Converters::CartridgeConverter.new({
                                                                     archive_file: cartridge
                                                                   })
    end
  end
end
